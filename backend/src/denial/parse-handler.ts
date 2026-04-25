import type { DenialExtracted } from "../extraction/types.js";
import { heuristicsFromDenialText } from "./heuristics.js";
import { openaiExtractFromImageBase64, openaiExtractFromText } from "./openai-extract.js";
import { textFromPdfBuffer } from "./parse-pdf.js";

export type ParseMeta = {
  source: "pdf-text" | "image-vision" | "heuristic-only";
  parseNote?: string;
};

export async function extractFromPdfBuffer(
  buf: Buffer,
  apiKey: string | undefined,
): Promise<{ extracted: DenialExtracted; meta: ParseMeta }> {
  const rawText = await textFromPdfBuffer(buf);
  if (!rawText.trim()) {
    return {
      extracted: heuristicsFromDenialText(""),
      meta: { source: "heuristic-only", parseNote: "No text could be read from this PDF." },
    };
  }

  if (apiKey) {
    try {
      const extracted = await openaiExtractFromText(apiKey, rawText);
      return { extracted, meta: { source: "pdf-text" } };
    } catch {
      return {
        extracted: heuristicsFromDenialText(rawText),
        meta: { source: "heuristic-only", parseNote: "OpenAI failed; used heuristics on extracted text." },
      };
    }
  }

  return { extracted: heuristicsFromDenialText(rawText), meta: { source: "pdf-text" } };
}

export async function extractFromImageBuffer(
  buf: Buffer,
  contentType: string,
  apiKey: string | undefined,
): Promise<{ extracted: DenialExtracted; meta: ParseMeta }> {
  if (!apiKey) {
    return {
      extracted: heuristicsFromDenialText(""),
      meta: {
        source: "heuristic-only",
        parseNote:
          "Image denials need OPENAI_API_KEY on the API server for vision extraction, or upload a searchable PDF.",
      },
    };
  }

  const mt =
    contentType === "image/png"
      ? ("image/png" as const)
      : contentType === "image/webp"
        ? ("image/webp" as const)
        : ("image/jpeg" as const);

  try {
    const extracted = await openaiExtractFromImageBase64(apiKey, mt, buf.toString("base64"));
    return { extracted, meta: { source: "image-vision" } };
  } catch (e) {
    return {
      extracted: heuristicsFromDenialText(""),
      meta: {
        source: "heuristic-only",
        parseNote: e instanceof Error ? e.message : "Vision extraction failed.",
      },
    };
  }
}

