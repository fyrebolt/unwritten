/**
 * Mongo's BSON types (ObjectId, Date) don't serialize as plain JSON values, so
 * we convert them to strings before sending to the client. Frontend types use
 * plain strings everywhere — see `lib/cases/client-types.ts`.
 */
import type { CaseDoc } from "./types";

export type SerializedCase = ReturnType<typeof serializeCase>;

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
  return undefined;
}

function toIsoRequired(value: unknown): string {
  return toIso(value) ?? new Date(0).toISOString();
}

export function serializeCase(c: CaseDoc) {
  return {
    id: c._id?.toString() ?? "",
    clerkUserId: c.clerkUserId,
    title: c.title,
    status: c.status,
    denialDocument: c.denialDocument
      ? {
          ...c.denialDocument,
          uploadedAt: toIso(c.denialDocument.uploadedAt),
        }
      : undefined,
    patientNarrative: c.patientNarrative
      ? {
          voiceTranscript: c.patientNarrative.voiceTranscript,
          extractedContext: c.patientNarrative.extractedContext,
          chatMessages: c.patientNarrative.chatMessages?.map((m) => ({
            ...m,
            timestamp: toIsoRequired(m.timestamp),
          })),
        }
      : undefined,
    appeal: c.appeal
      ? {
          draftLetter: c.appeal.draftLetter,
          citations: c.appeal.citations,
          policyFinding: c.appeal.policyFinding,
          evidenceFinding: c.appeal.evidenceFinding,
          caseFacts: c.appeal.caseFacts,
          generatedAt: toIso(c.appeal.generatedAt),
        }
      : undefined,
    delivery: c.delivery
      ? {
          ...c.delivery,
          sentAt: toIso(c.delivery.sentAt),
        }
      : undefined,
    timeline: c.timeline?.map((t) => ({
      event: t.event,
      details: t.details,
      timestamp: toIsoRequired(t.timestamp),
    })),
    createdAt: toIsoRequired(c.createdAt),
    updatedAt: toIsoRequired(c.updatedAt),
  };
}
