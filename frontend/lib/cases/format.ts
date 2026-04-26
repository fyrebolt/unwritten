/**
 * Display helpers for the new case schema (drafting / analyzing / sent / …).
 * The original mock used uppercase shouty status labels; we keep that look but
 * compute it from the real `status` enum so it still feels like the editorial
 * design, just driven by real data.
 */
import type { CaseStatus as OldStatus } from "@/lib/mock/cases";
import type { CaseStatus } from "@/lib/db/types";
import type { ClientCase } from "./client";

const STATUS_LABEL: Record<CaseStatus, OldStatus> = {
  intake: "DRAFTING",
  analyzing: "DRAFTING",
  drafting: "DRAFTING",
  review: "NEEDS REVIEW",
  sent: "AWAITING FAX CONFIRMATION",
  responded_approved: "APPEAL APPROVED",
  responded_denied: "APPEAL DENIED",
};

export function statusLabel(status: CaseStatus): OldStatus {
  return STATUS_LABEL[status] ?? "DRAFTING";
}

export function isCompleted(status: CaseStatus): boolean {
  return status === "responded_approved" || status === "responded_denied";
}

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = Math.round((t - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return RTF.format(Math.round(diffSec), "second");
  if (abs < 3600) return RTF.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return RTF.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604_800) return RTF.format(Math.round(diffSec / 86_400), "day");
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function summarizeCase(c: ClientCase) {
  const facts = c.denialDocument?.extractedFacts;
  const insurer = facts?.insurer ?? "Insurer pending";
  const service = facts?.serviceDenied ?? "Service pending";
  return {
    id: c.id,
    title: c.title,
    insurer,
    serviceDenied: service,
    status: statusLabel(c.status),
    rawStatus: c.status,
    completed: isCompleted(c.status),
    updatedAt: relativeTime(c.updatedAt),
  };
}
