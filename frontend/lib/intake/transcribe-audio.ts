/**
 * Sends the recorded blob to `/v1/intake/transcribe` (proxied as `/__unwritten_api` in the browser).
 * Used when Web Speech did not produce enough text; server runs Whisper (local or OpenAI API).
 */
import { getApiBase } from "@/lib/api";

export async function transcribeRecording(blob: Blob): Promise<string> {
  const base = getApiBase();
  const file = new File([blob], "recording.webm", {
    type: blob.type && blob.type !== "" ? blob.type : "audio/webm",
  });
  const fd = new FormData();
  fd.append("audio", file);

  const res = await fetch(`${base}/v1/intake/transcribe`, {
    method: "POST",
    body: fd,
  });
  const data = (await res.json()) as { ok?: boolean; text?: string; error?: string; hint?: string };
  if (!res.ok || !data.ok || !data.text) {
    throw new Error(`${data.error ?? "Transcription failed."} [HTTP ${res.status}]`);
  }
  return data.text;
}
