"use client";

import { motion } from "framer-motion";
import type { Stage } from "../NewCaseClient";

const STEPS: { id: Stage; label: string; caption: string }[] = [
  { id: "upload", label: "Denial", caption: "Upload the letter" },
  { id: "voice", label: "Context", caption: "Tell us what happened" },
  { id: "confirm", label: "Confirm", caption: "Review the facts" },
];

export function StageProgress({ stage }: { stage: Stage }) {
  const activeIdx = STEPS.findIndex((s) => s.id === stage);
  return (
    <ol className="grid grid-cols-3 gap-6">
      {STEPS.map((step, i) => {
        const active = i === activeIdx;
        const done = i < activeIdx;
        return (
          <li key={step.id} className="relative flex flex-col gap-3">
            <div className="relative h-px w-full bg-rule">
              <motion.span
                initial={false}
                animate={{ scaleX: done ? 1 : active ? 1 : 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ originX: 0 }}
                className="absolute inset-0 block bg-ochre"
                aria-hidden="true"
              />
            </div>
            <div className="flex items-baseline gap-3">
              <span
                className={
                  active
                    ? "font-sans text-[10px] uppercase tracking-[0.22em] text-ochre"
                    : done
                      ? "font-sans text-[10px] uppercase tracking-[0.22em] text-ink"
                      : "font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint"
                }
              >
                0{i + 1} · {step.label}
              </span>
            </div>
            <p
              className={
                active
                  ? "font-serif text-[1.05rem] leading-[1.3] text-ink"
                  : "font-serif text-[1.05rem] leading-[1.3] text-ink-muted"
              }
            >
              {step.caption}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
