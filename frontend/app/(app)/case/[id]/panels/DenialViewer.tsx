"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { DenialHighlight } from "@/lib/mock/denial";
import { DENIAL_HIGHLIGHTS } from "@/lib/mock/denial";
import type { ClientCase } from "@/lib/cases/client";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function DenialViewer({
  focus,
  done,
  seed,
}: {
  focus: DenialHighlight["tag"] | null;
  done: boolean;
  seed?: ClientCase;
}) {
  const source = buildSourceDoc(seed);
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Denial · Source document</Eyebrow>
        <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
          {done ? "Reviewed" : "Analyzing"}
        </span>
      </div>

      <article className="relative mx-auto w-full max-w-[480px] border border-rule bg-paper px-8 py-10 shadow-[0_30px_60px_-40px_rgba(28,22,12,0.25)]">
        <header className="mb-8 border-b border-rule pb-5">
          <p className="font-serif text-[0.72rem] uppercase tracking-[0.3em] text-ink-muted">
            {source.header.insurerName}
          </p>
          <p className="mt-1 font-sans text-[10px] text-ink-faint">
            {source.header.address}
          </p>
          <p className="mt-4 font-sans text-[11px] text-ink">{source.header.refLine}</p>
          <p className="font-sans text-[11px] text-ink-muted">{source.header.dateLine}</p>
        </header>

        <div className="space-y-0 font-serif text-[0.95rem] leading-[1.65] text-ink">
          {source.lines.map((line, i) => {
            const h = DENIAL_HIGHLIGHTS.find((x) => x.line === i);
            const isFocus = h && focus === h.tag;
            const content = line.length === 0 ? <br /> : line;
            return (
              <div key={i} className="relative">
                <AnimatePresence>
                  {isFocus && (
                    <motion.span
                      key={`hl-${i}`}
                      initial={{ opacity: 0, scaleX: 0.8 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0.95 }}
                      style={{ originX: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute -left-2 -right-2 top-1 bottom-1 -z-[1] rounded-[2px] bg-ochre/15"
                    />
                  )}
                </AnimatePresence>
                <p className={line.startsWith("    ") ? "pl-4" : ""}>{content}</p>
              </div>
            );
          })}
        </div>
      </article>
    </div>
  );
}

function buildSourceDoc(seed?: ClientCase) {
  const facts = seed?.denialDocument?.extractedFacts;
  const insurer = tidy(facts?.insurer) ?? "INSURER ON FILE";
  const memberId = tidy(facts?.memberId) ?? "information on file";
  const service = tidy(facts?.serviceDenied) ?? "requested service";
  const reason = tidy(facts?.denialReasonText) ?? "not medically necessary";
  const deadline = tidy(facts?.appealDeadline) ?? "the stated deadline";
  const fileName = tidy(seed?.denialDocument?.fileName) ?? "uploaded denial document";

  const reasonSentence = sentenceCase(reason);

  return {
    header: {
      insurerName: insurer.toUpperCase(),
      address: "Source: uploaded denial document",
      refLine: `Re: ${fileName} · Member ${memberId}`,
      dateLine: `Appeal deadline: ${deadline}`,
    },
    lines: [
      `${insurer} coverage determination notice`,
      "",
      `Member reference: ${memberId}`,
      "",
      `Requested service: ${service}`,
      "",
      "After review of the submitted documentation, this request was denied.",
      "",
      "Reason for denial:",
      "",
      `    ${reasonSentence}.`,
      "",
      `Appeal rights: submit written appeal by ${deadline}.`,
      "",
      "Sincerely,",
      "",
      `${insurer} Utilization Review`,
    ],
  };
}

function tidy(value: string | undefined | null): string | null {
  const v = value?.trim();
  return v && v.length > 0 ? v : null;
}

function sentenceCase(value: string): string {
  const normalized = value.trim().replace(/\.$/, "");
  if (!normalized) return "Information on file";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
