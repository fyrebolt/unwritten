import type { DenialExtracted } from "../extraction/types.js";
import { emptyExtracted } from "../extraction/types.js";

const SYSTEM = `You extract structured fields from U.S. health insurance denial letters.
Return ONLY valid JSON with keys: insurer, planType, memberId, serviceDenied, denialReason, appealDeadline.
Use empty string "" when unknown. Be concise; denialReason under 240 chars.`;

export async function openaiExtractFromText(
  apiKey: string,
  letterText: string,
): Promise<DenialExtracted> {
  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: letterText.slice(0, 24_000),
      },
    ],
    response_format: { type: "json_object" as const },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI chat failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty content.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("OpenAI returned non-JSON.");
  }

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

export async function openaiExtractFromImageBase64(
  apiKey: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  base64: string,
): Promise<DenialExtracted> {
  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the same JSON fields from this denial letter image.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mediaType};base64,${base64}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" as const },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI vision failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty content.");

  const parsed = JSON.parse(raw) as Record<string, unknown>;
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
