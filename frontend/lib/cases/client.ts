/**
 * Browser helpers for our /api/cases routes. Clerk's middleware adds the
 * session cookie automatically — we don't need a bearer token.
 *
 * Every helper goes through `parseResponse`, which:
 *   - reads the body as text first (so an HTML error overlay never kills the
 *     promise with "Unexpected token '<'"),
 *   - parses it as JSON when content-type allows,
 *   - throws an Error whose message is something a user can read in a toast.
 */
import type { SerializedCase } from "@/lib/db/serialize";
import type { DenialAsset } from "@/lib/cloudinary/types";
import type { DenialExtracted } from "@/lib/intake/types";

export type ClientCase = SerializedCase;

type Json = Record<string, unknown>;

function tryJsonParse(raw: string): Json | null {
  const t = raw.trim();
  if (!t || (t[0] !== "{" && t[0] !== "[")) return null;
  try {
    return JSON.parse(t) as Json;
  } catch {
    return null;
  }
}

async function parseResponse<T extends Json>(
  res: Response,
  fallbackLabel: string,
): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  let data: Json | null = null;
  if (ct.includes("application/json") && raw) {
    try {
      data = JSON.parse(raw) as Json;
    } catch {
      data = tryJsonParse(raw);
    }
  } else {
    // Some proxies or edge runtimes may strip or alter Content-Type. If the
    // body is still JSON, parse it so we never reject a valid 201/200.
    data = tryJsonParse(raw);
  }
  if (!res.ok || !data || data.ok === false) {
    const apiError = data && typeof data.error === "string" ? data.error : null;
    if (apiError) throw new Error(apiError);

    if (res.status === 401) throw new Error("Please sign in again.");
    if (res.status === 404) throw new Error(`${fallbackLabel} (not found).`);
    if (res.status === 503)
      throw new Error(
        "Database unavailable. Make sure MongoDB is running, or set MONGODB_URI to your Atlas connection string.",
      );

    const snippet = raw ? raw.replace(/\s+/g, " ").trim().slice(0, 140) : "";
    throw new Error(
      `${fallbackLabel} (${res.status} ${res.statusText || "error"}).${
        snippet ? ` ${snippet}` : ""
      }`,
    );
  }
  return data as T;
}

export async function syncUser(): Promise<void> {
  // Best-effort — we don't want a Mongo outage to block the dashboard mount.
  try {
    await fetch("/api/users/sync", { method: "POST" });
  } catch {
    // swallow
  }
}

export async function listCases(): Promise<ClientCase[]> {
  const res = await fetch("/api/cases", { cache: "no-store" });
  const data = await parseResponse<{ ok: true; cases: ClientCase[] }>(
    res,
    "Couldn't load your cases",
  );
  return data.cases ?? [];
}

export async function getCase(id: string): Promise<ClientCase | null> {
  const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const data = await parseResponse<{ ok: true; case: ClientCase }>(
    res,
    "Couldn't load this case",
  );
  return data.case ?? null;
}

export type CreateCaseInput = {
  fileName?: string;
  asset?: DenialAsset;
  extracted: DenialExtracted;
  parseNote?: string;
  transcript?: string;
};

export async function createCase(input: CreateCaseInput): Promise<ClientCase> {
  const res = await fetch("/api/cases", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: composeTitle(input.extracted),
      denialDocument: {
        cloudinaryPublicId: input.asset?.publicId,
        cloudinaryUrl: input.asset?.secureUrl,
        cloudinaryResourceType: input.asset?.resourceType,
        cloudinaryFormat: input.asset?.format,
        fileName: input.fileName,
        fileSize: input.asset?.bytes,
        uploadedAt: new Date().toISOString(),
        parseNote: input.parseNote,
        extractedFacts: {
          insurer: input.extracted.insurer,
          planType: input.extracted.planType,
          memberId: input.extracted.memberId,
          serviceDenied: input.extracted.serviceDenied,
          denialReasonText: input.extracted.denialReason,
          appealDeadline: input.extracted.appealDeadline,
        },
      },
      patientNarrative: input.transcript
        ? { voiceTranscript: input.transcript }
        : undefined,
    }),
  });
  const data = await parseResponse<{ ok: true; case: ClientCase }>(
    res,
    "Couldn't save case",
  );
  if (!data.case) throw new Error("Couldn't save case (empty response).");
  return data.case;
}

export type RunAgentsResponse = {
  ok: true;
  pdfNote?: string;
  case: ClientCase | null;
  /** Debug info from the Python pipeline — fallbacks used, service category, etc. */
  debug?: Record<string, unknown>;
  result: {
    letter: string;
    policyFinding: string;
    evidenceFinding: string;
    caseFacts: Record<string, unknown>;
  };
};

export async function runAgents(
  caseId: string,
  options?: { signal?: AbortSignal },
): Promise<RunAgentsResponse> {
  const res = await fetch(`/api/cases/${caseId}/agents/run`, {
    method: "POST",
    credentials: "include",
    signal: options?.signal,
  });
  const data = await parseResponse<RunAgentsResponse>(
    res,
    "Agents service couldn't run",
  );
  return data;
}

function composeTitle(e: DenialExtracted): string {
  const insurer = e.insurer?.trim();
  const service = e.serviceDenied?.trim();
  if (insurer && service) return `${insurer} — ${service}`;
  if (insurer) return `${insurer} appeal`;
  if (service) return `${service} appeal`;
  return "New appeal";
}
