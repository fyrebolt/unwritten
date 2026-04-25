import type { DenialExtracted } from "./types";

/** Demo extraction when the user chooses the sample denial (no file upload). */
export const SAMPLE_DENIAL_EXTRACTED: DenialExtracted = {
  insurer: "Anthem Blue Cross",
  planType: "PPO · CA",
  memberId: "XGJ442198730",
  serviceDenied: "Semaglutide (Ozempic) 1.0mg weekly",
  denialReason: "Not medically necessary",
  appealDeadline: "April 6, 2026",
};
