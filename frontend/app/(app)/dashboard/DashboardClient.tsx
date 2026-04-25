"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { defaultUser, getGreeting, getUser, type MockUser } from "@/lib/mock/user";
import type { MockCase } from "@/lib/mock/cases";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";

export function DashboardClient({
  active,
  completed,
}: {
  active: MockCase[];
  completed: MockCase[];
}) {
  const [user, setUserState] = useState<MockUser>(defaultUser);
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    const u = getUser() ?? defaultUser;
    setUserState(u);
    setGreeting(getGreeting(u.name));
  }, []);

  return (
    <div className="mx-auto max-w-[96rem] px-6 py-16 md:px-10 md:py-24 lg:px-14">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-16 flex flex-col gap-2"
      >
        <Eyebrow>Unwritten · Today</Eyebrow>
        <h1 className="font-serif text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-tight text-ink">
          {greeting || `Welcome back, ${user.name.split(" ")[0]}.`}
        </h1>
        <p className="mt-2 max-w-[52ch] font-serif text-[1.1rem] leading-[1.55] text-ink-muted">
          Three active appeals, two awaiting response. Begin when you're ready.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        className="mb-20"
      >
        <Link href="/case/new" className="group block">
          <Card
            interactive
            className="flex flex-col justify-between gap-8 p-10 md:flex-row md:items-end md:p-14"
          >
            <div className="flex flex-col gap-3">
              <Eyebrow>Begin</Eyebrow>
              <p className="max-w-[22ch] font-serif text-[clamp(1.75rem,3vw,2.6rem)] leading-[1.08] tracking-tight text-ink">
                Start a new appeal.
              </p>
              <p className="max-w-[44ch] font-sans text-[13px] leading-[1.65] text-ink-muted">
                Upload a denial letter. Tell us what happened. We'll draft the rest.
              </p>
            </div>
            <div className="flex items-center gap-3 font-sans text-[11px] uppercase tracking-[0.22em] text-ochre transition-transform duration-300 ease-editorial group-hover:translate-x-1">
              <span>Begin</span>
              <Arrow />
            </div>
          </Card>
        </Link>
      </motion.div>

      <section className="mb-20">
        <div className="mb-6 flex items-baseline justify-between">
          <Eyebrow>In progress</Eyebrow>
          <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
            {active.length} active
          </span>
        </div>
        <ul className="divide-y divide-rule border-y border-rule">
          {active.map((c, i) => (
            <CaseRow key={c.id} caseItem={c} index={i} />
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <Eyebrow>Completed</Eyebrow>
          <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
            {completed.length} resolved
          </span>
        </div>
        <ul className="divide-y divide-rule border-y border-rule">
          {completed.map((c, i) => (
            <CaseRow key={c.id} caseItem={c} index={i} muted />
          ))}
        </ul>
      </section>
    </div>
  );
}

function CaseRow({
  caseItem,
  index,
  muted,
}: {
  caseItem: MockCase;
  index: number;
  muted?: boolean;
}) {
  const href = caseItem.completed ? `/case/${caseItem.id}/detail` : `/case/${caseItem.id}`;
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.12 + index * 0.06 }}
    >
      <Link
        href={href}
        className="group grid grid-cols-[1fr_auto] items-center gap-6 py-6 transition-colors duration-200 ease-editorial"
      >
        <div className="flex flex-col gap-1.5">
          <h3
            className={
              muted
                ? "font-serif text-[1.2rem] leading-[1.25] text-ink-muted transition-colors duration-200 ease-editorial group-hover:text-ink"
                : "font-serif text-[1.35rem] leading-[1.2] tracking-tight text-ink transition-colors duration-200 ease-editorial group-hover:text-ochre"
            }
          >
            {caseItem.title}
          </h3>
          <p className="font-sans text-[12px] text-ink-muted">
            {caseItem.serviceDenied} · {caseItem.insurer}
          </p>
        </div>
        <div className="flex items-center gap-5">
          <span className="hidden font-sans text-[11px] uppercase tracking-[0.18em] text-ink-faint md:inline">
            {caseItem.updatedAt}
          </span>
          <Pill status={caseItem.status} />
        </div>
      </Link>
    </motion.li>
  );
}

function Arrow() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
      <path
        d="M1 5h12M9 1l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
