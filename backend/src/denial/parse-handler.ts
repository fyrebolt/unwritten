import type { DenialExtracted } from "../extraction/types.js";
import { anthropicExtractFromImageBase64, anthropicExtractFromPdf } from "./anthropic-extract.js";
import { heuristicsFromDenialText } from "./heuristics.js";
import { geminiExtractFromImageBase64, geminiExtractFromPdf } from "./gemini-extract.js";
import { openaiExtractFromImageBase64, openaiExtractFromText } from "./openai-extract.js";
import { textFromPdfBuffer } from "./parse-pdf.js";

export type ParseMeta = {
  source:
    | "pdf-text"
    | "pdf-anthropic"
    | "pdf-gemini"
    | "image-vision"
    | "image-anthropic"
    | "image-gemini"
    | "heuristic-only";
  parseNote?: string;
};

function anthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || undefined;
}

async function fallbackPdfFromExtractedText(
  buf: Buffer,
  prefixNote: string,
  openaiKey: string | undefined,
): Promise<{ extracted: DenialExtracted; meta: ParseMeta }> {
  const rawText = await textFromPdfBuffer(buf);
  if (!rawText.trim()) {
    return {
      extracted: heuristicsFromDenialText(""),
      meta: {
        source: "heuristic-only",
        parseNote: `${prefixNote} No embedded PDF text; heuristics only.`,
      },
    };
  }
  if (openaiKey) {
    try {
      const extracted = await openaiExtractFromText(openaiKey, rawText);
      return {
        extracted,
        meta: { source: "pdf-text", parseNote: `${prefixNote} OpenAI on extracted text.` },
      };
    } catch {
      return {
        extracted: heuristicsFromDenialText(rawText),
        meta: { source: "heuristic-only", parseNote: `${prefixNote} OpenAI failed; heuristics on PDF text.` },
      };
    }
  }
  return {
    extracted: heuristicsFromDenialText(rawText),
    meta: { source: "pdf-text", parseNote: `${prefixNote} Heuristics on extracted PDF text.` },
  };
}

export async function extractFromPdfBuffer(
  buf: Buffer,
  openaiKey: string | undefined,
): Promise<{ extracted: DenialExtracted; meta: ParseMeta }> {
  const akey = anthropicKey();
  const gkey = geminiKey();

  if (akey) {
    try {
      const extracted = await anthropicExtractFromPdf(akey, buf);
      return { extracted, meta: { source: "pdf-anthropic" } };
    } catch (e) {
      const note = e instanceof Error ? e.message : "Anthropic PDF failed.";
      if (gkey) {
        try {
          const extracted = await geminiExtractFromPdf(gkey, buf);
          return {
            extracted,
            meta: { source: "pdf-gemini", parseNote: `Anthropic failed; used Gemini. (${note})` },
          };
        } catch (e2) {
          const note2 = e2 instanceof Error ? e2.message : "Gemini failed.";
          return fallbackPdfFromExtractedText(buf, `${note} ${note2}`, openaiKey);
        }
      }
      return fallbackPdfFromExtractedText(buf, note, openaiKey);
    }
  }

  if (gkey) {
    try {
      const extracted = await geminiExtractFromPdf(gkey, buf);
      return { extracted, meta: { source: "pdf-gemini" } };
    } catch (e) {
      const note = e instanceof Error ? e.message : "Gemini PDF extraction failed.";
      return fallbackPdfFromExtractedText(buf, note, openaiKey);
    }
  }

  const rawText = await textFromPdfBuffer(buf);
  if (!rawText.trim()) {
    return {
      extracted: heuristicsFromDenialText(""),
      meta: {
        source: "heuristic-only",
        parseNote:
          "No text could be read from this PDF. Set ANTHROPIC_API_KEY or GEMINI_API_KEY for native PDF parsing, or upload a searchable PDF.",
      },
    };
  }

  if (openaiKey) {
    try {
      const extracted = await openaiExtractFromText(openaiKey, rawText);
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
  openaiKey: string | undefined,
): Promise<{ extracted: DenialExtracted; meta: ParseMeta }> {
  const akey = anthropicKey();
  const gkey = geminiKey();
  const mt =
    contentType === "image/png"
      ? ("image/png" as const)
      : contentType === "image/webp"
        ? ("image/webp" as const)
        : ("image/jpeg" as const);

  const b64 = buf.toString("base64");

  if (akey) {
    try {
      const extracted = await anthropicExtractFromImageBase64(akey, mt, b64);
      return { extracted, meta: { source: "image-anthropic" } };
    } catch (e) {
      const note = e instanceof Error ? e.message : "Anthropic vision failed.";
      if (gkey) {
        try {
          const extracted = await geminiExtractFromImageBase64(gkey, mt, b64);
          return {
            extracted,
            meta: { source: "image-gemini", parseNote: `Anthropic failed; used Gemini. (${note})` },
          };
        } catch (e2) {
          const note2 = e2 instanceof Error ? e2.message : "Gemini failed.";
          if (openaiKey) {
            try {
              const extracted = await openaiExtractFromImageBase64(openaiKey, mt, b64);
              return {
                extracted,
                meta: { source: "image-vision", parseNote: `Anthropic & Gemini failed; OpenAI. (${note} ${note2})` },
              };
            } catch (e3) {
              return {
                extracted: heuristicsFromDenialText(""),
                meta: {
                  source: "heuristic-only",
                  parseNote: e3 instanceof Error ? e3.message : "OpenAI vision failed.",
                },
              };
            }
          }
          return {
            extracted: heuristicsFromDenialText(""),
            meta: { source: "heuristic-only", parseNote: `${note} ${note2}` },
          };
        }
      }
      if (openaiKey) {
        try {
          const extracted = await openaiExtractFromImageBase64(openaiKey, mt, b64);
          return {
            extracted,
            meta: { source: "image-vision", parseNote: `Anthropic failed; used OpenAI. (${note})` },
          };
        } catch (e2) {
          return {
            extracted: heuristicsFromDenialText(""),
            meta: { source: "heuristic-only", parseNote: e2 instanceof Error ? e2.message : "OpenAI vision failed." },
          };
        }
      }
      return {
        extracted: heuristicsFromDenialText(""),
        meta: { source: "heuristic-only", parseNote: note },
      };
    }
  }

  if (gkey) {
    try {
      const extracted = await geminiExtractFromImageBase64(gkey, mt, b64);
      return { extracted, meta: { source: "image-gemini" } };
    } catch (e) {
      const note = e instanceof Error ? e.message : "Gemini vision failed.";
      if (openaiKey) {
        try {
          const extracted = await openaiExtractFromImageBase64(openaiKey, mt, b64);
          return {
            extracted,
            meta: { source: "image-vision", parseNote: `Gemini failed; used OpenAI. (${note})` },
          };
        } catch (e2) {
          return {
            extracted: heuristicsFromDenialText(""),
            meta: {
              source: "heuristic-only",
              parseNote: e2 instanceof Error ? e2.message : "OpenAI vision failed after Gemini.",
            },
          };
        }
      }
      return {
        extracted: heuristicsFromDenialText(""),
        meta: { source: "heuristic-only", parseNote: `${note} Set OPENAI_API_KEY or ANTHROPIC_API_KEY for another provider, or upload a PDF.` },
      };
    }
  }

  if (!openaiKey) {
    return {
      extracted: heuristicsFromDenialText(""),
      meta: {
        source: "heuristic-only",
        parseNote:
          "Image denials need ANTHROPIC_API_KEY, GEMINI_API_KEY (or GOOGLE_API_KEY), or OPENAI_API_KEY for vision extraction, or upload a searchable PDF.",
      },
    };
  }

  try {
    const extracted = await openaiExtractFromImageBase64(openaiKey, mt, b64);
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
