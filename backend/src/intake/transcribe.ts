/**
 * Intake voice backup: open-source Whisper on the server (optional) or OpenAI Whisper API (`whisper-1`),
 * then optional Claude polish. Browser path: Web Speech; see VoiceStage.
 * @see https://github.com/openai/whisper
 */

import { localWhisperEnabled, transcribeWithLocalOpenaiWhisper } from "./whisper-local.js";

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
};

/**
 * Prefers LOCAL_WHISPER=1 (github.com/openai/whisper on the host). Falls back to Whisper API if local fails and OPENAI_API_KEY is set.
 */
export async function transcribeIntakeRecording(
  keys: IntakeTranscribeKeys,
  buf: Buffer,
  filename: string,
): Promise<string> {
  let draft: string;

  if (localWhisperEnabled()) {
    try {
      draft = await transcribeWithLocalOpenaiWhisper(buf, filename);
    } catch (localErr) {
      if (keys.openaiKey) {
        draft = await transcribeWithOpenAiWhisper(keys.openaiKey, buf, filename);
      } else {
        throw localErr;
      }
    }
  } else if (keys.openaiKey) {
    draft = await transcribeWithOpenAiWhisper(keys.openaiKey, buf, filename);
  } else {
    throw new Error(
      "No transcription backend: set LOCAL_WHISPER=1 with ffmpeg + openai-whisper on the server (see https://github.com/openai/whisper), or set OPENAI_API_KEY for the Whisper API.",
    );
  }

  draft = draft.trim();
  if (!draft) throw new Error("No speech detected in the recording.");

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
