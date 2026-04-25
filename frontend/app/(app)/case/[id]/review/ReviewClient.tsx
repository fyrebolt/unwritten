"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { appealLetter } from "@/lib/mock/letter";
import { policyChunks } from "@/lib/mock/policies";
import type { MockCase } from "@/lib/mock/cases";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

type SentenceKey = `${number}-${number}`;

export function ReviewClient({ caseItem }: { caseItem: MockCase }) {
  const initialSentences = useMemo(() => {
    const m: Record<SentenceKey, string> = {};
    appealLetter.paragraphs.forEach((p, pi) => {
      p.sentences.forEach((s, si) => {
        m[`${pi}-${si}`] = s.text;
      });
    });
    return m;
  }, []);

  const [edits, setEdits] = useState<Record<SentenceKey, string>>(initialSentences);
  const [focusedCitation, setFocusedCitation] = useState<string | null>(
    "policy-1",
  );
  const [editing, setEditing] = useState<SentenceKey | null>(null);

  const focused = focusedCitation ? policyChunks[focusedCitation] : null;
  const totalEdits = Object.keys(edits).filter(
    (k) => edits[k as SentenceKey] !== initialSentences[k as SentenceKey],
  ).length;

  let citeIdx = 0;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <header className="flex items-center justify-between border-b border-rule px-6 py-5 md:px-10 lg:px-14">
        <div className="flex flex-col gap-1">
          <Eyebrow>Review · {caseItem.id.replace("case_", "").toUpperCase()}</Eyebrow>
          <h1 className="font-serif text-[1.6rem] leading-[1.15] tracking-tight text-ink">
            Review and edit
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint md:inline">
            {totalEdits} edits · draft saved
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/case/${caseItem.id}`}>Back to workspace</Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href={`/case/${caseItem.id}/send`}>Send appeal →</Link>
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.2fr_1fr] lg:divide-x lg:divide-rule">
        <section className="overflow-y-auto px-6 py-12 md:px-12 lg:px-16">
          <article className="mx-auto max-w-[60ch]">
            <header className="mb-10 border-b border-rule pb-6">
              <div className="flex items-baseline justify-between font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                <span>{appealLetter.header.appeal}</span>
                <span>{appealLetter.header.via}</span>
              </div>
              <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                {appealLetter.header.office} · {appealLetter.header.date}
              </p>
              <p className="mt-6 font-serif text-[1.2rem] leading-[1.3] tracking-tight text-ink">
                {appealLetter.subject}
              </p>
            </header>

            <div className="space-y-8">
              {appealLetter.paragraphs.map((p, pi) => (
                <p
                  key={pi}
                  className="font-serif text-[1.05rem] leading-[1.85] text-ink"
                >
                  {p.lead && (
                    <span className="mr-2 font-sans text-[10px] uppercase tracking-[0.22em] text-ochre">
                      {p.lead}
                    </span>
                  )}
                  {p.sentences.map((s, si) => {
                    const key = `${pi}-${si}` as SentenceKey;
                    const value = edits[key];
                    const isEditing = editing === key;
                    return (
                      <span key={key}>
                        {isEditing ? (
                          <textarea
                            value={value}
                            autoFocus
                            onBlur={() => setEditing(null)}
                            onChange={(e) =>
                              setEdits((m) => ({ ...m, [key]: e.target.value }))
                            }
                            className="w-full resize-none border border-ochre bg-ochre/5 px-3 py-2 font-serif text-[1.05rem] leading-[1.75] text-ink outline-none"
                            rows={Math.max(2, Math.ceil(value.length / 70))}
                          />
                        ) : (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => setEditing(key)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditing(key);
                            }}
                            className="cursor-text rounded-[2px] transition-colors duration-150 ease-editorial hover:bg-ochre/5"
                          >
                            {value}
                          </span>
                        )}
                        {s.citations.map((cid) => {
                          const idx = ++citeIdx;
                          return (
                            <sup key={`${cid}-${idx}`} className="ml-[1px]">
                              <button
                                onClick={() => setFocusedCitation(cid)}
                                className={
                                  focusedCitation === cid
                                    ? "font-sans text-[0.7em] text-ochre underline decoration-ochre underline-offset-2"
                                    : "font-sans text-[0.7em] text-ochre hover:underline"
                                }
                              >
                                {idx}
                              </button>
                            </sup>
                          );
                        })}{" "}
                      </span>
                    );
                  })}
                </p>
              ))}
              <p className="pt-2 font-serif text-[1rem] text-ink-muted">
                {appealLetter.closing}
              </p>
            </div>
          </article>
        </section>

        <aside className="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto px-6 py-12 md:px-10 lg:px-12">
          <Eyebrow>Source · Tap a citation</Eyebrow>
          <AnimatePresence mode="wait">
            {focused ? (
              <motion.div
                key={focused.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="mt-5 border border-rule bg-paper p-6"
              >
                <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ochre">
                  {focused.section}
                </p>
                <h3 className="mt-3 font-serif text-[1.3rem] leading-[1.25] tracking-tight text-ink">
                  {focused.title}
                </h3>
                <p className="mt-4 font-serif text-[1rem] leading-[1.65] text-ink">
                  &ldquo;{focused.quote}&rdquo;
                </p>
                <div className="mt-6 border-t border-rule pt-4">
                  <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                    Full context
                  </p>
                  <p className="mt-2 font-serif text-[0.95rem] leading-[1.65] text-ink-muted">
                    {focused.fullText}
                  </p>
                </div>
                <p className="mt-6 font-sans text-[11px] text-ink-faint">
                  {focused.source} · p. {focused.page}
                </p>
              </motion.div>
            ) : (
              <p className="mt-6 font-serif text-[0.95rem] italic text-ink-muted">
                Tap any citation number in the letter to see its source.
              </p>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}
