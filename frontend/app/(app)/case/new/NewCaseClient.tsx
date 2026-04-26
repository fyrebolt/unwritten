"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadStage } from "./stages/UploadStage";
import { VoiceStage } from "./stages/VoiceStage";
import { ConfirmStage } from "./stages/ConfirmStage";
import { StageProgress } from "./stages/StageProgress";
import type { DenialAsset } from "@/lib/cloudinary/types";
import type { IntakeUploadPayload } from "@/lib/intake/types";
import { createCase } from "@/lib/cases/client";

export type Stage = "upload" | "voice" | "confirm";

export type IntakeDraft = {
  fileName?: string;
  denialAsset?: DenialAsset;
  parseNote?: string;
  transcript?: string;
  extracted: {
    insurer: string;
    planType: string;
    memberId: string;
    serviceDenied: string;
    denialReason: string;
    appealDeadline: string;
  };
};

const emptyDraft: IntakeDraft = {
  extracted: {
    insurer: "",
    planType: "",
    memberId: "",
    serviceDenied: "",
    denialReason: "",
    appealDeadline: "",
  },
};

export function NewCaseClient() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("upload");
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);

  const advance = (next: Stage) => setStage(next);

  const handleExtraction = (payload: IntakeUploadPayload) => {
    setDraft((d) => ({
      ...d,
      fileName: payload.fileName,
      denialAsset: payload.asset,
      parseNote: payload.parseNote,
      extracted: payload.extracted,
    }));
    advance("voice");
  };

  const handleTranscript = (t: string) => {
    setDraft((d) => ({ ...d, transcript: t }));
    advance("confirm");
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = await createCase({
        fileName: draft.fileName,
        asset: draft.denialAsset,
        extracted: draft.extracted,
        parseNote: draft.parseNote,
        transcript: draft.transcript,
      });
      router.push(`/case/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save the case.";
      toast.error("Couldn't save case", { description: msg });
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[72rem] px-6 py-14 md:px-10 md:py-20 lg:px-14">
      <StageProgress stage={stage} />
      <div className="relative mt-14 min-h-[540px]">
        <AnimatePresence mode="wait">
          {stage === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <UploadStage onExtracted={handleExtraction} />
            </motion.div>
          )}
          {stage === "voice" && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <VoiceStage onContinue={handleTranscript} />
            </motion.div>
          )}
          {stage === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <ConfirmStage
                draft={draft}
                onChange={(next) =>
                  setDraft((d) => ({ ...d, extracted: { ...d.extracted, ...next } }))
                }
                onBack={() => advance("voice")}
                onConfirm={handleConfirm}
                submitting={submitting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
