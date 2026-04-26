/**
 * Browser helpers for our /api/cases routes. Clerk's middleware adds the
 * session cookie automatically — we don't need a bearer token.
 */
import type { SerializedCase } from "@/lib/db/serialize";
import type { DenialAsset } from "@/lib/cloudinary/types";
import type { DenialExtracted } from "@/lib/intake/types";

export type ClientCase = SerializedCase;

export async function syncUser(): Promise<void> {
  await fetch("/api/users/sync", { method: "POST" }).catch(() => undefined);
}

export async function listCases(): Promise<ClientCase[]> {
  const res = await fetch("/api/cases", { cache: "no-store" });
  const data = (await res.json()) as { ok: boolean; cases?: ClientCase[]; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error ?? `List failed (${res.status})`);
  return data.cases ?? [];
}

export async function getCase(id: string): Promise<ClientCase | null> {
  const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const data = (await res.json()) as { ok: boolean; case?: ClientCase; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error ?? `Fetch failed (${res.status})`);
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
  const data = (await res.json()) as { ok: boolean; case?: ClientCase; error?: string };
  if (!res.ok || !data.ok || !data.case) {
    throw new Error(data.error ?? `Create failed (${res.status})`);
  }
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

export async function runAgents(caseId: string): Promise<RunAgentsResponse> {
  const res = await fetch(`/api/cases/${caseId}/agents/run`, { method: "POST" });
  const data = (await res.json()) as RunAgentsResponse | { ok: false; error: string };
  if (!res.ok || data.ok === false) {
    throw new Error("error" in data ? data.error : `Agents failed (${res.status})`);
  }
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
