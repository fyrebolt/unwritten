/**
 * Mongo's BSON types (ObjectId, Date) don't serialize as plain JSON values, so
 * we convert them to strings before sending to the client. Frontend types use
 * plain strings everywhere — see `lib/cases/client-types.ts`.
 */
import type { CaseDoc } from "./types";

export type SerializedCase = ReturnType<typeof serializeCase>;

export function serializeCase(c: CaseDoc) {
  return {
    id: c._id?.toString() ?? "",
    clerkUserId: c.clerkUserId,
    title: c.title,
    status: c.status,
    denialDocument: c.denialDocument
      ? {
          ...c.denialDocument,
          uploadedAt: c.denialDocument.uploadedAt?.toISOString(),
        }
      : undefined,
    patientNarrative: c.patientNarrative
      ? {
          voiceTranscript: c.patientNarrative.voiceTranscript,
          extractedContext: c.patientNarrative.extractedContext,
          chatMessages: c.patientNarrative.chatMessages?.map((m) => ({
            ...m,
            timestamp: m.timestamp.toISOString(),
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
          generatedAt: c.appeal.generatedAt?.toISOString(),
        }
      : undefined,
    delivery: c.delivery
      ? {
          ...c.delivery,
          sentAt: c.delivery.sentAt?.toISOString(),
        }
      : undefined,
    timeline: c.timeline?.map((t) => ({
      event: t.event,
      details: t.details,
      timestamp: t.timestamp.toISOString(),
    })),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
