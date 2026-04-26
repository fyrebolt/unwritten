import type { DenialAsset } from "@/lib/cloudinary/types";

export type DenialExtracted = {
  insurer: string;
  planType: string;
  memberId: string;
  serviceDenied: string;
  denialReason: string;
  appealDeadline: string;
};

export type ParseDenialResponse = {
  ok: boolean;
  extracted?: DenialExtracted;
  meta?: { source?: string; parseNote?: string };
  error?: string;
};

export type IntakeUploadPayload = {
  fileName: string;
  asset?: DenialAsset;
  extracted: DenialExtracted;
  parseNote?: string;
};
