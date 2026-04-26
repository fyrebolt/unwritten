/**
 * Intake “what happened?” voice → text (Step 02 backup when Web Speech is empty or unavailable).
 *
 * Backend chain (first available wins, with auto-fallback on failure):
 *   1. LOCAL_WHISPER=1 — open-source Whisper on the API host (needs ffmpeg + pip `openai-whisper`).
 *   2. Gemini — `inline_data` audio to gemini-2.0-flash. No system deps; uses GEMINI_API_KEY.
 *   3. OpenAI Whisper API — needs OPENAI_API_KEY.
 *
 * If Anthropic is configured, the STT string is optionally polished; polish errors fall back to
 * raw STT so a bad Claude call does not lose a good transcript.
 *
 * Primary UX is still the browser Web Speech API + typing; see `VoiceStage.tsx`.
 * @see https://github.com/openai/whisper
 * @see https://ai.google.dev/gemini-api/docs/audio
 */

import { localWhisperEnabled, transcribeWithLocalOpenaiWhisper } from "./whisper-local.js";
import { geminiTranscribeAvailable, transcribeWithGemini } from "./gemini-transcribe.js";

function anthropicIntakeModel(): string {
  return (
    process.env.ANTHROPIC_INTAKE_TRANSCRIBE_MODEL?.trim() ||
    process.env.ANTHROPIC_PARSE_MODEL?.trim() ||
    "claude-haiku-4-5"
  );
}

function inferAudioMime(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp3") || lower.endsWith(".mpeg")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".flac")) return "audio/flac";
  return "audio/webm";
}

export async function transcribeWithOpenAiWhisper(
  apiKey: string,
  buf: Buffer,
  filename: string,
): Promise<string> {
  const form = new FormData();
  const name = filename || "recording.webm";
  const mime = inferAudioMime(name);
  const file = new File([new Uint8Array(buf)], name, { type: mime });
  form.append("file", file);
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper API failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new Error("Whisper API returned no text.");
  return data.text.trim();
}

function extractAnthropicAssistantText(data: unknown): string {
  const d = data as { content?: Array<{ type?: string; text?: string }> };
  return (d.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("")
    .trim();
}

const CLAUDE_INTAKE_POLISH_SYSTEM = `You clean up automatic speech-to-text for someone describing a U.S. health insurance situation (claim, denial, appeal, or care).
Fix obvious recognition errors and disfluencies; keep their meaning, facts, names, dates, and numbers. Do not invent details.
Reply with a single plain paragraph: only the speaker's words, no title, no quotes wrapper, no bullet list.`;

export async function polishIntakeTranscriptWithClaude(apiKey: string, draft: string): Promise<string> {
  const model = anthropicIntakeModel();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: CLAUDE_INTAKE_POLISH_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Raw automatic transcript:\n\n${draft}`,
        },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message ?? JSON.stringify(data).slice(0, 240);
    throw new Error(`Claude transcript polish failed (${res.status}): ${msg}`);
  }

  const out = extractAnthropicAssistantText(data);
  return out.trim() || draft.trim();
}

export type IntakeTranscribeKeys = {
  openaiKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
};

export function intakeTranscribeAvailable(keys: IntakeTranscribeKeys): boolean {
  return (
    localWhisperEnabled() ||
    Boolean(keys.geminiKey) ||
    Boolean(keys.openaiKey) ||
    geminiTranscribeAvailable()
  );
}

/**
 * Tries each configured STT backend in priority order, falling back on failure.
 * Returns the first non-empty transcript. Throws an aggregated error if none work.
 */
export async function transcribeIntakeRecording(
  keys: IntakeTranscribeKeys,
  buf: Buffer,
  filename: string,
): Promise<string> {
  const geminiKey = keys.geminiKey || process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  const attempts: Array<{ name: string; run: () => Promise<string> }> = [];

  if (localWhisperEnabled()) {
    attempts.push({ name: "local-whisper", run: () => transcribeWithLocalOpenaiWhisper(buf, filename) });
  }
  if (geminiKey) {
    attempts.push({ name: "gemini", run: () => transcribeWithGemini(geminiKey, buf, filename) });
  }
  if (keys.openaiKey) {
    attempts.push({ name: "openai-whisper", run: () => transcribeWithOpenAiWhisper(keys.openaiKey!, buf, filename) });
  }

  if (attempts.length === 0) {
    throw new Error(
      "No transcription backend configured. Set GEMINI_API_KEY (no install), or set LOCAL_WHISPER=1 with ffmpeg + openai-whisper on the server (https://github.com/openai/whisper), or set OPENAI_API_KEY for the Whisper API.",
    );
  }

  let draft = "";
  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const out = (await attempt.run()).trim();
      if (out) {
        draft = out;
        if (errors.length) {
          console.warn(
            `[intake/transcribe] ${attempt.name} succeeded after fallbacks: ${errors.join(" | ")}`,
          );
        }
        break;
      }
      errors.push(`${attempt.name}: empty transcript`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${attempt.name}: ${msg}`);
      console.warn(`[intake/transcribe] ${attempt.name} failed:`, msg);
    }
  }

  if (!draft) {
    throw new Error(
      `All transcription backends failed. ${errors.join(" | ")}`,
    );
  }

  if (keys.anthropicKey) {
    try {
      return await polishIntakeTranscriptWithClaude(keys.anthropicKey, draft);
    } catch (e) {
      const note = e instanceof Error ? e.message : String(e);
      console.warn("[intake/transcribe] Claude polish failed; returning raw STT:", note);
      return draft;
    }
  }
  return draft;
}
