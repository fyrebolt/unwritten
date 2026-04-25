"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { MockCase } from "@/lib/mock/cases";
import { mockTimeline } from "@/lib/mock/timeline";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Pill } from "@/components/ui/Pill";
import { Timeline } from "@/components/ui/Timeline";
import { Button } from "@/components/ui/Button";
import { appealLetter } from "@/lib/mock/letter";

const FACTS: { key: keyof MockCase; label: string }[] = [
  { key: "insurer", label: "Insurer" },
  { key: "planType", label: "Plan" },
  { key: "memberId", label: "Member ID" },
  { key: "serviceDenied", label: "Service denied" },
  { key: "denialReason", label: "Denial reason" },
  { key: "appealDeadline", label: "Deadline" },
];

export function DetailClient({ caseItem }: { caseItem: MockCase }) {
  return (
    <div className="mx-auto max-w-[96rem] px-6 py-14 md:px-10 md:py-20 lg:px-14">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-16 grid grid-cols-1 gap-10 md:grid-cols-[1fr_auto] md:items-end"
      >
        <div className="flex flex-col gap-3">
          <Eyebrow>Case · {caseItem.id.replace("case_", "").toUpperCase()}</Eyebrow>
          <h1 className="max-w-[24ch] font-serif text-[clamp(2.25rem,4.5vw,3.6rem)] leading-[1.05] tracking-tight text-ink">
            {caseItem.title}
          </h1>
          <p className="max-w-[44ch] font-serif text-[1.05rem] leading-[1.6] text-ink-muted">
            Filed {caseItem.createdAt}. {caseItem.updatedAt === "just now" ? "Just submitted." : `Last update ${caseItem.updatedAt}.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Pill status={caseItem.status} />
          {!caseItem.completed && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/case/${caseItem.id}/review`}>Open review</Link>
            </Button>
          )}
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
        <section>
          <Eyebrow className="mb-6">Timeline</Eyebrow>
          <Timeline events={mockTimeline} />
        </section>

        <aside className="flex flex-col gap-10">
          <section>
            <Eyebrow className="mb-6">Facts of record</Eyebrow>
            <ul className="divide-y divide-rule border-y border-rule">
              {FACTS.map((f) => (
                <li key={f.key} className="grid grid-cols-[140px_1fr] items-baseline gap-4 py-4">
                  <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                    {f.label}
                  </span>
                  <span className="font-serif text-[1rem] text-ink">
                    {String(caseItem[f.key])}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <Eyebrow className="mb-6">Submitted letter</Eyebrow>
            <article className="border border-rule bg-paper p-8">
              <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ochre">
                {appealLetter.header.appeal}
              </p>
              <h3 className="mt-3 font-serif text-[1.2rem] leading-[1.3] tracking-tight text-ink">
                {appealLetter.subject}
              </h3>
              <p className="mt-4 line-clamp-4 font-serif text-[0.95rem] leading-[1.65] text-ink-muted">
                {appealLetter.paragraphs[0].sentences[0].text}{" "}
                {appealLetter.paragraphs[0].sentences[1].text}
              </p>
              <div className="mt-6 flex items-center justify-between font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
                <span>{appealLetter.header.date}</span>
                <Link
                  href={`/case/${caseItem.id}/review`}
                  className="text-ochre hover:underline"
                >
                  Open full letter →
                </Link>
              </div>
            </article>
          </section>
        </aside>
      </div>
    </div>
  );
}
