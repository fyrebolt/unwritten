import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Open-source Whisper on the API host (same project as https://github.com/openai/whisper).
 * Requires `ffmpeg` on PATH and `pip install -U openai-whisper` (or `WHISPER_CLI` to the `whisper` executable).
 */

export function localWhisperEnabled(): boolean {
  return process.env.LOCAL_WHISPER?.trim() === "1";
}

function inferExt(filename: string): string {
  const n = filename.toLowerCase();
  if (n.endsWith(".wav")) return "wav";
  if (n.endsWith(".mp3")) return "mp3";
  if (n.endsWith(".webm")) return "webm";
  if (n.endsWith(".ogg")) return "ogg";
  if (n.endsWith(".m4a")) return "m4a";
  if (n.endsWith(".flac")) return "flac";
  return "webm";
}

function runSpawn(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "ignore"],
      env: process.env,
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} exited with code ${code ?? "?"}${signal ? ` (${signal})` : ""}`,
        ),
      );
    });
  });
}

export async function transcribeWithLocalOpenaiWhisper(buf: Buffer, filename: string): Promise<string> {
  const id = randomBytes(12).toString("hex");
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), `whisper-${id}-`));
  const ext = inferExt(filename || "recording.webm");
  const rawPath = path.join(tmp, `input.${ext}`);
  const wavPath = path.join(tmp, "input.wav");
  /** First run downloads weights; tiny is fastest. Override with WHISPER_MODEL=base|small|… */
  const model = process.env.WHISPER_MODEL?.trim() || "tiny";
  const lang = process.env.WHISPER_LANGUAGE?.trim() || "en";
  const python = process.env.WHISPER_PYTHON?.trim() || "python3";
  const whisperCli = process.env.WHISPER_CLI?.trim();
  const ffmpegTimeout = Number(process.env.WHISPER_FFMPEG_TIMEOUT_MS?.trim()) || 120_000;
  const whisperTimeout = Number(process.env.WHISPER_TIMEOUT_MS?.trim()) || 1_800_000;

  const commonArgs = [
    wavPath,
    "--model",
    model,
    "--output_dir",
    tmp,
    "--output_format",
    "txt",
    "--fp16",
    "False",
    "--language",
    lang,
    "--verbose",
    "False",
  ];

  try {
    if (ext === "wav") {
      await fs.writeFile(wavPath, buf);
    } else {
      await fs.writeFile(rawPath, buf);
      await runSpawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          rawPath,
          "-ar",
          "16000",
          "-ac",
          "1",
          "-c:a",
          "pcm_s16le",
          wavPath,
        ],
        ffmpegTimeout,
      );
    }

    if (whisperCli) {
      await runSpawn(whisperCli, commonArgs, whisperTimeout);
    } else {
      await runSpawn(python, ["-m", "whisper", ...commonArgs], whisperTimeout);
    }

    const expectedTxt = path.join(tmp, "input.txt");
    let text: string;
    try {
      text = await fs.readFile(expectedTxt, "utf8");
    } catch {
      const names = await fs.readdir(tmp);
      const txtFile = names.find((f) => f.endsWith(".txt"));
      if (!txtFile) {
        throw new Error(
          `Local Whisper wrote no .txt (got: ${names.join(", ") || "empty"}). Check ffmpeg, pip install openai-whisper, and WHISPER_MODEL.`,
        );
      }
      text = await fs.readFile(path.join(tmp, txtFile), "utf8");
    }

    const out = text.trim();
    if (!out) {
      throw new Error(
        "Local Whisper produced an empty transcript (silence or unreadable audio). Speak closer to the mic, record a few seconds, or check the browser codec.",
      );
    }
    return out;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    const hint =
      err?.code === "ENOENT"
        ? " Install ffmpeg and openai-whisper (https://github.com/openai/whisper), or set WHISPER_PYTHON / WHISPER_CLI to the interpreter that has `whisper` installed."
        : "";
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Local Whisper failed: ${msg}${hint}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
