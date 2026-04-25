/**
 * OpenAI Whisper transcription (server holds OPENAI_API_KEY).
 * Browser can also use Web Speech API when this is unavailable.
 */
export async function transcribeAudioBuffer(
  apiKey: string,
  buf: Buffer,
  filename: string,
): Promise<string> {
  const form = new FormData();
  const name = filename || "clip.webm";
  const file = new File([new Uint8Array(buf)], name, { type: "audio/webm" });
  form.append("file", file);
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new Error("Whisper returned no text.");
  return data.text.trim();
}
