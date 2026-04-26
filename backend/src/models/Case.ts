import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;

const CASE_STATUSES = [
  "DRAFTING",
  "AWAITING_FAX_CONFIRMATION",
  "INSURER_RESPONDED",
  "APPEAL_APPROVED",
  "APPEAL_DENIED",
  "NEEDS_REVIEW",
] as const;

type CaseStatus = (typeof CASE_STATUSES)[number];

type UploadArtifact = {
  kind: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  uploadedAt: Date;
};

type TranscriptSegment = {
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
};

type TranscriptInfo = {
  sourceFileKey?: string;
  text: string;
  confidence?: number;
  segments: TranscriptSegment[];
  createdAt: Date;
};

type AppealDraft = {
  body: string;
  model?: string;
  createdAt: Date;
};

type AppealInfo = {
  drafts: AppealDraft[];
  finalVersion?: string;
  sentAt?: Date;
};

type CaseActivity = {
  type: string;
  message: string;
  createdAt: Date;
};

type CaseHistoryContext = {
  diagnoses: string[];
  medications: string[];
  allergies: string[];
  notes?: string;
};

type DenialInfo = {
  insurer?: string;
  planType?: string;
  memberId?: string;
  serviceDenied?: string;
  denialReason?: string;
  appealDeadline?: string;
  rawText?: string;
};

export type CaseDocument = {
  _id: string;
  userId: Types.ObjectId;
  title: string;
  status: CaseStatus;
  denial: DenialInfo;
  uploads: UploadArtifact[];
  transcript?: TranscriptInfo;
  appeal: AppealInfo;
  historyContext: CaseHistoryContext;
  activity: CaseActivity[];
  createdAt: Date;
  updatedAt: Date;
};

const uploadArtifactSchema = new Schema<UploadArtifact>(
  {
    kind: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    storageKey: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const transcriptSegmentSchema = new Schema<TranscriptSegment>(
  {
    speaker: { type: String, required: true },
    text: { type: String, required: true },
    startMs: { type: Number, required: true },
    endMs: { type: Number, required: true },
  },
  { _id: false },
);

const transcriptInfoSchema = new Schema<TranscriptInfo>(
  {
    sourceFileKey: { type: String },
    text: { type: String, required: true },
    confidence: { type: Number },
    segments: { type: [transcriptSegmentSchema], default: [] },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const appealDraftSchema = new Schema<AppealDraft>(
  {
    body: { type: String, required: true },
    model: { type: String },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const appealInfoSchema = new Schema<AppealInfo>(
  {
    drafts: { type: [appealDraftSchema], default: [] },
    finalVersion: { type: String },
    sentAt: { type: Date },
  },
  { _id: false },
);

const activitySchema = new Schema<CaseActivity>(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const caseHistoryContextSchema = new Schema<CaseHistoryContext>(
  {
    diagnoses: { type: [String], default: [] },
    medications: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const denialSchema = new Schema<DenialInfo>(
  {
    insurer: { type: String },
    planType: { type: String },
    memberId: { type: String },
    serviceDenied: { type: String },
    denialReason: { type: String },
    appealDeadline: { type: String },
    rawText: { type: String },
  },
  { _id: false },
);

const caseSchema = new Schema<CaseDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    title: { type: String, required: true },
    status: { type: String, enum: CASE_STATUSES, default: "DRAFTING" },
    denial: { type: denialSchema, default: () => ({}) },
    uploads: { type: [uploadArtifactSchema], default: [] },
    transcript: { type: transcriptInfoSchema },
    appeal: { type: appealInfoSchema, default: () => ({ drafts: [] }) },
    historyContext: { type: caseHistoryContextSchema, default: () => ({}) },
    activity: { type: [activitySchema], default: [] },
  },
  {
    timestamps: true,
  },
);

caseSchema.index({ userId: 1, updatedAt: -1 });

export const Case = mongoose.models.Case || model<CaseDocument>("Case", caseSchema);
