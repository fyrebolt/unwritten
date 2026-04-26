/**
 * Mongo document shapes. Per the Atlas plan, we store *structured* data here;
 * binaries (denial PDFs, fax receipts) live in Cloudinary and only the URL +
 * public id ride on these documents.
 *
 * Foreign keys are always `clerkUserId` — Clerk owns identity; this collection
 * holds app-specific user data keyed on Clerk's user id.
 */
import type { ObjectId } from "mongodb";

export type CaseStatus =
  | "intake"
  | "analyzing"
  | "drafting"
  | "review"
  | "sent"
  | "responded_approved"
  | "responded_denied";

export type DenialDocument = {
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  cloudinaryResourceType?: string;
  cloudinaryFormat?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: Date;
  extractedFacts?: {
    insurer?: string;
    planType?: string;
    memberId?: string;
    denialDate?: string;
    serviceDenied?: string;
    cptCode?: string;
    ndcCode?: string;
    denialReasonCode?: string;
    denialReasonText?: string;
    appealDeadline?: string;
  };
  parseNote?: string;
};

export type PatientNarrative = {
  voiceTranscript?: string;
  chatMessages?: Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>;
  extractedContext?: Record<string, unknown>;
};

export type AppealCitation = {
  marker: string;
  sourceCollection?: "policy_corpus" | "evidence_corpus";
  chunkId?: string;
  documentName?: string;
  pageNumber?: number;
  quote?: string;
};

export type AppealDoc = {
  draftLetter?: string;
  citations?: AppealCitation[];
  generatedAt?: Date;
  policyFinding?: string;
  evidenceFinding?: string;
  caseFacts?: Record<string, unknown>;
};

export type DeliveryDoc = {
  method?: "fax" | "email" | "portal";
  target?: string;
  sentAt?: Date;
  transmissionId?: string;
  confirmationDocCloudinaryId?: string;
};

export type CaseTimelineEntry = {
  event: string;
  timestamp: Date;
  details?: Record<string, unknown>;
};

export type CaseDoc = {
  _id?: ObjectId;
  clerkUserId: string;
  title: string;
  status: CaseStatus;
  denialDocument?: DenialDocument;
  patientNarrative?: PatientNarrative;
  appeal?: AppealDoc;
  delivery?: DeliveryDoc;
  timeline?: CaseTimelineEntry[];
  agentConfigOverride?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDoc = {
  _id?: ObjectId;
  clerkUserId: string;
  email?: string;
  displayName?: string;
  defaultAgentConfig?: Record<string, unknown>;
  medicalProfile?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    physicianName?: string;
    physicianContact?: string;
  };
  insuranceProfile?: {
    insurer?: string;
    planType?: string;
    memberId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};
