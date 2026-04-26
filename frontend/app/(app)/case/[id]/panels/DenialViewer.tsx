"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { DenialHighlight } from "@/lib/mock/denial";
import {
  DENIAL_HEADER,
  DENIAL_HIGHLIGHTS,
  DENIAL_LINES,
} from "@/lib/mock/denial";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function DenialViewer({
  focus,
  done,
}: {
  focus: DenialHighlight["tag"] | null;
  done: boolean;
}) {
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
            {DENIAL_HEADER.insurerName}
          </p>
          <p className="mt-1 font-sans text-[10px] text-ink-faint">
            {DENIAL_HEADER.address}
          </p>
          <p className="mt-4 font-sans text-[11px] text-ink">{DENIAL_HEADER.refLine}</p>
          <p className="font-sans text-[11px] text-ink-muted">{DENIAL_HEADER.dateLine}</p>
        </header>

        <div className="space-y-0 font-serif text-[0.95rem] leading-[1.65] text-ink">
          {DENIAL_LINES.map((line, i) => {
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
