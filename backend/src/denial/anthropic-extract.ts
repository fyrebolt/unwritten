import type { DenialExtracted } from "../extraction/types.js";
import { emptyExtracted } from "../extraction/types.js";

const SYSTEM = `You extract structured fields from U.S. health insurance denial letters.
Return ONLY valid JSON with keys: insurer, planType, memberId, serviceDenied, denialReason, appealDeadline.
Use empty string "" when unknown. Be concise; denialReason under 240 characters.
Do not wrap the JSON in markdown fences.`;

const MAX_INLINE_PDF_BYTES = 20 * 1024 * 1024;

function parseModel(): string {
  return process.env.ANTHROPIC_PARSE_MODEL?.trim() || "claude-haiku-4-5";
}

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

function extractAssistantText(data: unknown): string {
  const d = data as { content?: Array<{ type?: string; text?: string }> };
  return (d.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("")
    .trim();
}

function parseJsonFromAssistant(raw: string): Record<string, unknown> {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "");
  }
  return JSON.parse(t) as Record<string, unknown>;
}

async function messagesCreate(
  apiKey: string,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): Promise<DenialExtracted> {
  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    ...extraHeaders,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message ?? JSON.stringify(data).slice(0, 240);
    throw new Error(`Anthropic failed (${res.status}): ${msg}`);
  }

  const raw = extractAssistantText(data);
  if (!raw) throw new Error("Anthropic returned no text.");
  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonFromAssistant(raw);
  } catch {
    throw new Error("Anthropic returned non-JSON.");
  }
  return recordToExtracted(parsed);
}

export async function anthropicExtractFromPdf(apiKey: string, pdf: Buffer): Promise<DenialExtracted> {
  if (pdf.length > MAX_INLINE_PDF_BYTES) {
    throw new Error(`PDF is too large for inline Claude (${pdf.length} bytes; max ${MAX_INLINE_PDF_BYTES}).`);
  }

  return messagesCreate(
    apiKey,
    {
      model: parseModel(),
      max_tokens: 4096,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdf.toString("base64"),
              },
            },
            {
              type: "text",
              text: "Extract the JSON fields from this denial letter PDF.",
            },
          ],
        },
      ],
    },
    { "anthropic-beta": "pdfs-2024-09-25" },
  );
}

export async function anthropicExtractFromImageBase64(
  apiKey: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  base64: string,
): Promise<DenialExtracted> {
  return messagesCreate(apiKey, {
    model: parseModel(),
    max_tokens: 4096,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: "Extract the JSON fields from this denial letter image.",
          },
        ],
      },
    ],
  });
}
