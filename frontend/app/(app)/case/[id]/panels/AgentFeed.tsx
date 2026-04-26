"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { AgentEvent, AgentKind } from "@/lib/mock/agents";
import { agentDotColors, agentLabels } from "@/lib/mock/agents";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function AgentFeed({
  visible,
  activeAgent,
  elapsed,
  done,
}: {
  visible: AgentEvent[];
  activeAgent?: AgentKind;
  elapsed: number;
  done: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Agent activity</Eyebrow>
        <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
          {done ? "Complete" : "Running"}
        </span>
      </div>

      <ol className="relative flex flex-col gap-8">
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-[3px] top-2 w-px bg-rule"
        />
        <AnimatePresence initial={false}>
          {visible.map((ev) => {
            const endAt = ev.atSeconds + ev.durationMs / 1000;
            const isActive = elapsed < endAt && activeAgent === ev.agent;
            const hasResult = elapsed >= endAt && !!ev.result;
            return (
              <motion.li
                key={ev.id}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative pl-7"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[9px] inline-block h-[7px] w-[7px] rounded-full"
                  style={{ background: agentDotColors[ev.agent] }}
                >
                  {isActive && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      style={{ background: agentDotColors[ev.agent], opacity: 0.4 }}
                      animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </span>
                <p
                  className="font-sans text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: agentDotColors[ev.agent] }}
                >
                  {agentLabels[ev.agent]}
                </p>
                <p className="mt-2 font-serif text-[1.1rem] leading-[1.4] text-ink">
                  {ev.action}
                </p>
                <AnimatePresence>
                  {hasResult && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-3 max-w-[42ch] font-serif text-[0.92rem] leading-[1.55] text-ink-muted"
                    >
                      → {ev.result}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}
