"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { appealLetter } from "@/lib/mock/letter";
import { CitationPopover } from "@/components/ui/CitationPopover";
import { Eyebrow } from "@/components/ui/Eyebrow";

const CHARS_PER_SEC = 58;

export function LiveLetter({
  startAt,
  elapsed,
  letterProgress,
  done,
}: {
  startAt: number;
  elapsed: number;
  letterProgress: number;
  done: boolean;
}) {
  const dynamicCharTarget = Math.max(0, Math.floor(letterProgress * CHARS_PER_SEC));
  const started = elapsed >= startAt;

  const { paragraphs, globalCitationIndex, totalLetterChars } = useMemo(() => {
    let used = 0;
    let cites = 0;
    const result = appealLetter.paragraphs.map((p) => {
      const sentences = p.sentences.map((s) => {
        const startChar = used;
        used += s.text.length + 1;
        return { ...s, startChar, endChar: used };
      });
      return { lead: p.lead, sentences };
    });
    for (const p of result) {
      for (const s of p.sentences) cites += s.citations.length;
    }
    return { paragraphs: result, globalCitationIndex: cites, totalLetterChars: used };
  }, []);
  const totalCharTarget = done ? totalLetterChars : dynamicCharTarget;

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
