/**
 * Intake STT via Gemini (no ffmpeg / no python required).
 *
 * Gemini 2.0 Flash accepts audio directly via `inline_data` parts. We send the
 * raw browser blob (typically `audio/webm` from MediaRecorder) base64-encoded
 * and ask Gemini to verbatim-transcribe it.
 *
 * @see https://ai.google.dev/gemini-api/docs/audio
 */

const MAX_INLINE_AUDIO_BYTES = 18 * 1024 * 1024; // Gemini inline cap is ~20 MB; leave headroom.

const TRANSCRIBE_PROMPT = `You are a speech-to-text engine for a U.S. health-insurance intake recording.
Transcribe the audio verbatim into a single plain paragraph.
- Output only the spoken words, nothing else.
- Do not include timestamps, speaker labels, headings, quotes, or markdown.
- Preserve numbers, dates, names, and acronyms as the speaker said them.
- If the audio is silent or unintelligible, output exactly: __NO_SPEECH__`;

function geminiAudioModel(): string {
  return (
    process.env.GEMINI_INTAKE_TRANSCRIBE_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.0-flash"
  );
}

function inferAudioMime(filename: string): string {
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp3") || lower.endsWith(".mpeg")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".aac")) return "audio/aac";
  return "audio/webm";
}

function responseText(data: unknown): string | undefined {
  const d = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const parts = d.candidates?.[0]?.content?.parts;
  if (!parts?.length) return undefined;
  return parts.map((p) => p.text ?? "").join("").trim() || undefined;
}

export async function transcribeWithGemini(
  apiKey: string,
  buf: Buffer,
  filename: string,
): Promise<string> {
  if (buf.length > MAX_INLINE_AUDIO_BYTES) {
    throw new Error(
      `Audio too large for inline Gemini (${buf.length} bytes; max ${MAX_INLINE_AUDIO_BYTES}). ` +
        `Use a shorter recording or wire the Gemini File API.`,
    );
  }

  const model = geminiAudioModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const mime = inferAudioMime(filename);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: TRANSCRIBE_PROMPT },
            {
              inline_data: {
                mime_type: mime,
                data: buf.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "text/plain",
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: { message?: string } })?.error?.message ??
      JSON.stringify(data).slice(0, 200);
    throw new Error(`Gemini transcribe failed (${res.status}): ${msg}`);
  }

  const raw = responseText(data);
  if (!raw) {
    const block = (data as { promptFeedback?: { blockReason?: string } })?.promptFeedback
      ?.blockReason;
    throw new Error(
      block ? `Gemini blocked the request (${block}).` : "Gemini returned no text.",
    );
  }

  const cleaned = raw.replace(/^["']+|["']+$/g, "").trim();
  if (cleaned === "__NO_SPEECH__" || !cleaned) {
    throw new Error(
      "Gemini detected no speech in the recording. Speak closer to the mic or try again.",
    );
  }
  return cleaned;
}

export function geminiTranscribeAvailable(): boolean {
  return Boolean(
    (process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()),
  );
}
