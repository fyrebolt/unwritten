"use client";

import { motion } from "framer-motion";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Renders the appeal letter the agent pipeline produced. While agents are
 * still running we show a calm "drafting" placeholder; the moment the parent
 * passes a non-empty `letter`, we reveal the real text with a fade-in.
 *
 * No mock content. No hardcoded headers, dates, or citations. The agents
 * generate a self-contained business letter (member block, date, RE line,
 * salutation, body, sign-off) and we render it as monospace-spaced preformatted
 * text inside the paper-styled article so judges see exactly what gets faxed.
 */
export function LiveLetter({
  letter,
  done,
}: {
  /** The real agent-generated letter, or `null` while still drafting. */
  letter: string | null;
  /** True once the cinematic timer + agent run have BOTH completed. */
  done: boolean;
}) {
  const hasLetter = Boolean(letter && letter.trim());

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Appeal letter · Live draft</Eyebrow>
        <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
          {done && hasLetter ? "Draft ready" : hasLetter ? "Reviewing…" : "Drafting…"}
        </span>
      </div>

      <article className="relative mx-auto w-full max-w-[560px] border border-rule bg-paper px-10 py-12 shadow-[0_30px_60px_-40px_rgba(28,22,12,0.2)]">
        {!hasLetter && <DraftingPlaceholder />}

        {hasLetter && (
          <motion.pre
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="whitespace-pre-wrap break-words font-serif text-[0.98rem] leading-[1.7] text-ink"
          >
            {letter}
          </motion.pre>
        )}
      </article>
    </div>
  );
}

function DraftingPlaceholder() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 text-center">
      <p className="max-w-[36ch] font-serif text-[1rem] italic leading-[1.6] text-ink-muted">
        The drafting agent is reviewing policy and evidence before composing
        your appeal letter…
      </p>
      <motion.div
        aria-hidden="true"
        className="h-1 w-12 rounded-full bg-ochre"
        animate={{ opacity: [0.35, 1, 0.35], x: [-22, 22, -22] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
