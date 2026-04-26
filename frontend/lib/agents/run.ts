/**
 * Server-side wrapper around the Python agents service (`agents/main_api.py`,
 * default http://127.0.0.1:8788). The service accepts multipart with a `file`
 * (PDF) plus optional `message` and `voice` fields and returns:
 *
 *     { ok, case_data, policy_finding, evidence_finding, letter, error? }
 *
 * We re-shape that into a typed object the case workspace can render.
 */

export type AgentsRunInput = {
  pdf?: { buffer: Buffer; fileName: string };
  message?: string;
  voice?: string;
};

export type AgentsRunResult = {
  ok: true;
  caseFacts: Record<string, unknown>;
  policyFinding: string;
  evidenceFinding: string;
  letter: string;
  rawResponse: unknown;
};

export type AgentsRunError = {
  ok: false;
  error: string;
  rawResponse?: unknown;
};

const DEFAULT_AGENTS_URL =
  process.env.AGENTS_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8788";

export async function runAgents(
  input: AgentsRunInput,
): Promise<AgentsRunResult | AgentsRunError> {
  const composedInput = [input.message, input.voice].filter(Boolean).join("\n\n").trim();
  const payload = {
    input: composedInput,
  };

  let res: Response;
  try {
    res = await fetch(`${DEFAULT_AGENTS_URL}/v1/intake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      ok: false,
      error: `Could not reach agents service at ${DEFAULT_AGENTS_URL}: ${
        err instanceof Error ? err.message : String(err)
      }. Is \`python -m agents.main_api\` running?`,
    };
  }

  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: `Agents service returned non-JSON (HTTP ${res.status}).` };
  }

  if (!res.ok || json?.ok === false) {
    return {
      ok: false,
      error: typeof json?.error === "string" ? json.error : `Agents call failed (${res.status}).`,
      rawResponse: json,
    };
  }

  return {
    ok: true,
    caseFacts: (json.case_data as Record<string, unknown>) ?? {},
    policyFinding: typeof json.policy_finding === "string" ? json.policy_finding : "",
    evidenceFinding: typeof json.evidence_finding === "string" ? json.evidence_finding : "",
    letter: typeof json.letter === "string" ? json.letter : "",
    rawResponse: json,
  };
}

export async function fetchPdfBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Cloudinary fetch failed (${res.status}) for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
