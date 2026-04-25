import type { DenialExtracted } from "../extraction/types.js";
import { emptyExtracted } from "../extraction/types.js";

const EXTRACT_PROMPT = `You extract structured fields from U.S. health insurance denial letters.
Return ONLY valid JSON with keys: insurer, planType, memberId, serviceDenied, denialReason, appealDeadline.
Use empty string "" when unknown. Be concise; denialReason under 240 characters.`;

const MAX_INLINE_PDF_BYTES = 12 * 1024 * 1024;

function recordToExtracted(parsed: Record<string, unknown>): DenialExtracted {
  const e = emptyExtracted();
  const s = (k: string) => (typeof parsed[k] === "string" ? (parsed[k] as string) : "");
  e.insurer = s("insurer");
  e.planType = s("planType");
  e.memberId = s("memberId");
  e.serviceDenied = s("serviceDenied");
  e.denialReason = s("denialReason");
  e.appealDeadline = s("appealDeadline");
  return e;
}

function responseText(data: unknown): string | undefined {
  const d = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  const parts = d.candidates?.[0]?.content?.parts;
  if (!parts?.length) return undefined;
  return parts.map((p) => p.text ?? "").join("").trim() || undefined;
}

function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

async function geminiGenerateJson(apiKey: string, parts: Array<Record<string, unknown>>): Promise<DenialExtracted> {
  const model = geminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: { message?: string } })?.error?.message ??
      JSON.stringify(data).slice(0, 200);
    throw new Error(`Gemini failed (${res.status}): ${msg}`);
  }

  const raw = responseText(data);
  if (!raw) {
    const block = (data as { promptFeedback?: { blockReason?: string } })?.promptFeedback?.blockReason;
    throw new Error(block ? `Gemini blocked the request (${block}).` : "Gemini returned no text.");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Gemini returned non-JSON.");
  }
  return recordToExtracted(parsed);
}

export async function geminiExtractFromPdf(apiKey: string, pdf: Buffer): Promise<DenialExtracted> {
  if (pdf.length > MAX_INLINE_PDF_BYTES) {
    throw new Error(`PDF is too large for inline Gemini (${pdf.length} bytes; max ${MAX_INLINE_PDF_BYTES}).`);
  }
  return geminiGenerateJson(apiKey, [
    { inline_data: { mime_type: "application/pdf", data: pdf.toString("base64") } },
    { text: EXTRACT_PROMPT },
  ]);
}

export async function geminiExtractFromImageBase64(
  apiKey: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  base64: string,
): Promise<DenialExtracted> {
  return geminiGenerateJson(apiKey, [
    { inline_data: { mime_type: mediaType, data: base64 } },
    { text: `${EXTRACT_PROMPT}\nThe denial is provided as an image.` },
  ]);
}
