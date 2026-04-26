"use client";

import { AdvancedImage } from "@cloudinary/react";
import { motion } from "framer-motion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getCld } from "@/lib/cloudinary/config";
import { scale } from "@cloudinary/url-gen/actions/resize";
import type { IntakeDraft } from "../NewCaseClient";

const FIELDS: { key: keyof IntakeDraft["extracted"]; label: string }[] = [
  { key: "insurer", label: "Insurer" },
  { key: "planType", label: "Plan type" },
  { key: "memberId", label: "Member ID" },
  { key: "serviceDenied", label: "Service denied" },
  { key: "denialReason", label: "Denial reason" },
  { key: "appealDeadline", label: "Appeal deadline" },
];

export function ConfirmStage({
  draft,
  onChange,
  onBack,
  onConfirm,
  submitting,
}: {
  draft: IntakeDraft;
  onChange: (next: Partial<IntakeDraft["extracted"]>) => void;
  onBack: () => void;
  onConfirm: () => void;
  submitting?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-14 md:grid-cols-[1fr_1.1fr] md:gap-20">
      <div className="flex flex-col gap-4">
        <Eyebrow>Step 03</Eyebrow>
        <h1 className="max-w-[22ch] font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-tight text-ink">
          Does this read right?
        </h1>
        <p className="max-w-[44ch] font-serif text-[1.05rem] leading-[1.6] text-ink-muted">
          We pulled these from your denial letter. Tap any field to correct it.
          Everything else lives in the file.
        </p>
        {draft.fileName && (
          <div className="mt-4 space-y-3 border border-rule px-4 py-3">
            <div className="flex items-center gap-3">
              <DocGlyph />
              <span className="font-sans text-[12px] text-ink">{draft.fileName}</span>
            </div>
            {draft.parseNote && (
              <p className="font-sans text-[11px] leading-relaxed text-ink-muted">{draft.parseNote}</p>
            )}
            {draft.denialAsset && (
              <>
                <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                  Stored on Cloudinary
                  {draft.denialAsset.resourceType === "raw" ? " · PDF" : ""}
                </p>
                {draft.denialAsset.resourceType === "image" ? (
                  <div className="aspect-[4/3] w-full max-w-sm overflow-hidden border border-rule bg-paper-deep/30">
                    <AdvancedImage
                      cldImg={getCld()
                        .image(draft.denialAsset.publicId)
                        .resize(scale().width(720))
                        .format("auto")
                        .quality("auto")}
                      alt="Denial letter preview"
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                ) : (
                  <a
                    href={draft.denialAsset.secureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-sans text-[11px] uppercase tracking-[0.18em] text-ochre underline-offset-4 hover:underline"
                  >
                    Open uploaded file
                  </a>
                )}
              </>
            )}
          </div>
        )}
        {draft.transcript && (
          <div className="mt-2 border border-rule px-4 py-3">
            <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              Your context
            </p>
            <p className="mt-2 line-clamp-4 font-serif text-[0.95rem] leading-[1.55] text-ink-muted">
              {draft.transcript}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
          className="divide-y divide-rule border-y border-rule"
        >
          {FIELDS.map((f) => (
            <motion.li
              key={f.key}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-[140px_1fr] items-baseline gap-4 py-5"
            >
              <label
                htmlFor={f.key}
                className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted"
              >
                {f.label}
              </label>
              <Input
                id={f.key}
                sizeVariant="md"
                value={draft.extracted[f.key]}
                onChange={(e) => onChange({ [f.key]: e.target.value })}
                className="border-b-0"
              />
            </motion.li>
          ))}
        </motion.ul>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted transition-colors duration-200 ease-editorial hover:text-ink disabled:opacity-40"
          >
            ← Back
          </button>
          <Button
            variant="primary"
            size="lg"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Begin drafting"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DocGlyph() {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
      <path
        d="M2 1h8l5 5v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1"
        className="text-ink-muted"
      />
      <path d="M10 1v5h5" stroke="currentColor" strokeWidth="1" className="text-ink-muted" />
    </svg>
  );
}
