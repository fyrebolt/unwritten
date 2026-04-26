"use client";

import { motion } from "framer-motion";
import { appealLetter } from "@/lib/mock/letter";
import { CitationPopover } from "@/components/ui/CitationPopover";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Buffer between "letter fully typed" and "done" flipping. The cinematic
 * timer in the parent fires `done = true` at SIMULATION_SECONDS regardless of
 * letter length, so we want the typewriter to have already reached the last
 * character a beat earlier. Without this slack, the closing fade-in collides
 * with the final keystrokes and reads as a jump.
 */
const TYPING_SETTLE_BUFFER_S = 0.55;

/**
 * Pre-compute the layout of the letter once at module-load. The shape never
 * changes (it's static mock data), so doing it inside a useMemo just adds a
 * render-time cost on every animation frame.
 */
const PARAGRAPHS = (() => {
  let used = 0;
  return appealLetter.paragraphs.map((p) => {
    const sentences = p.sentences.map((s) => {
      const startChar = used;
      used += s.text.length + 1;
      return { ...s, startChar, endChar: used };
    });
    return { lead: p.lead, sentences };
  });
})();

const TOTAL_LETTER_CHARS = PARAGRAPHS.reduce(
  (sum, p) => sum + p.sentences.reduce((s, sn) => s + sn.text.length + 1, 0),
  0,
);

const TOTAL_CITATIONS = PARAGRAPHS.reduce(
  (sum, p) => sum + p.sentences.reduce((s, sn) => s + sn.citations.length, 0),
  0,
);

export function LiveLetter({
  startAt,
  elapsed,
  letterProgress,
  done,
  typingDuration,
}: {
  startAt: number;
  elapsed: number;
  letterProgress: number;
  done: boolean;
  /** Seconds available for the typing animation. Derived in the parent from
   * `simulationSeconds - draftingStart` so the speed adapts if either is
   * tweaked. */
  typingDuration: number;
}) {
  const started = elapsed >= startAt;

  // Adaptive cadence: pace the typing so the last character lands
  // TYPING_SETTLE_BUFFER_S before `done` fires. Previously this was a fixed
  // 58 chars/s, which only typed ~440 of the ~1500-char letter inside the
  // drafting window — `done` then snapped the visible text to the full
  // length, producing the jarring jump.
  // Pace via a normalized 0..1 progress + Math.round, so there's no float
  // off-by-one at the boundary (raw `Math.floor(letterProgress * charsPerSec)`
  // could leave us 1 char shy of the end on the last frame).
  const effectiveDuration = Math.max(0.5, typingDuration - TYPING_SETTLE_BUFFER_S);
  const ratio = Math.min(1, Math.max(0, letterProgress / effectiveDuration));
  const dynamicCharTarget = Math.min(
    TOTAL_LETTER_CHARS,
    Math.round(ratio * TOTAL_LETTER_CHARS),
  );
  const totalCharTarget = done ? TOTAL_LETTER_CHARS : dynamicCharTarget;
  const paragraphs = PARAGRAPHS;
  const globalCitationIndex = TOTAL_CITATIONS;

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Appeal letter · Live draft</Eyebrow>
        <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
          {done ? "Draft ready" : started ? "Writing…" : "Queued"}
        </span>
      </div>

      <article className="relative mx-auto w-full max-w-[560px] border border-rule bg-paper px-10 py-12 shadow-[0_30px_60px_-40px_rgba(28,22,12,0.2)]">
        <header className="mb-10 border-b border-rule pb-6">
          <div className="flex items-baseline justify-between font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            <span>{appealLetter.header.appeal}</span>
            <span>{appealLetter.header.via}</span>
          </div>
          <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            {appealLetter.header.office} · {appealLetter.header.date}
          </p>
          <p className="mt-6 font-serif text-[1.1rem] leading-[1.3] tracking-tight text-ink">
            {appealLetter.subject}
          </p>
        </header>

        {!started && (
          <p className="font-serif text-[0.95rem] italic text-ink-muted">
            The drafting agent is reviewing policy and evidence before composing…
          </p>
        )}

        {started && (
          <div className="space-y-8 font-serif text-[1rem] leading-[1.8] text-ink">
            {(() => {
              let citeIdx = 0;
              return paragraphs.map((p, pi) => {
                const chunks = [];
                if (p.lead) {
                  chunks.push(
                    <span
                      key={`lead-${pi}`}
                      className="mr-2 font-sans text-[10px] uppercase tracking-[0.22em] text-ochre"
                    >
                      {p.lead}
                    </span>,
                  );
                }
                for (const s of p.sentences) {
                  const visibleChars = Math.max(
                    0,
                    Math.min(s.text.length, totalCharTarget - s.startChar),
                  );
                  const sentenceDone = visibleChars >= s.text.length;
                  const shown = s.text.slice(0, visibleChars);
                  chunks.push(
                    <span key={`s-${pi}-${s.startChar}`}>
                      {shown}
                      {sentenceDone &&
                        s.citations.map((cid) => {
                          const idx = ++citeIdx;
                          return (
                            <motion.span
                              key={`c-${cid}-${idx}`}
                              initial={{ opacity: 0, y: -2 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                              className="inline"
                            >
                              <CitationPopover citationId={cid} index={idx} />
                            </motion.span>
                          );
                        })}
                      {!sentenceDone && visibleChars > 0 && (
                        <span className="caret" />
                      )}{" "}
                    </span>,
                  );
                  if (visibleChars === 0 && !sentenceDone) break;
                }
                const hasAnyText = p.sentences.some(
                  (s) => Math.max(0, totalCharTarget - s.startChar) > 0,
                );
                if (!hasAnyText && !p.lead) return null;
                return (
                  <p key={`p-${pi}`} className="max-w-[52ch]">
                    {chunks}
                  </p>
                );
              });
            })()}

            {done && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="pt-4 font-serif text-[0.95rem] text-ink-muted"
              >
                {appealLetter.closing}
              </motion.p>
            )}
          </div>
        )}

        {done && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 border-t border-rule pt-4 font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint"
          >
            {globalCitationIndex} citations · {paragraphs.length} paragraphs
          </motion.p>
        )}
      </article>
    </div>
  );
}
