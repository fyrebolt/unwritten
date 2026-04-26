"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { listCases, syncUser, type ClientCase } from "@/lib/cases/client";
import { summarizeCase } from "@/lib/cases/format";

type Summary = ReturnType<typeof summarizeCase>;

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const first = name.trim().split(/\s+/)[0] || "there";
  if (hour < 5) return `Still up, ${first}.`;
  if (hour < 12) return `Good morning, ${first}.`;
  if (hour < 17) return `Good afternoon, ${first}.`;
  if (hour < 21) return `Good evening, ${first}.`;
  return `Late night, ${first}.`;
}

export function DashboardClient() {
  const { user, isLoaded } = useUser();
  const [cases, setCases] = useState<ClientCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await syncUser();
        const data = await listCases();
        if (!cancelled) setCases(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load cases.");
          setCases([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { active, completed } = useMemo(() => {
    if (!cases) return { active: [] as Summary[], completed: [] as Summary[] };
    const summaries = cases.map(summarizeCase);
    return {
      active: summaries.filter((s) => !s.completed),
      completed: summaries.filter((s) => s.completed),
    };
  }, [cases]);

  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "there";
  const greeting = isLoaded ? getGreeting(displayName) : "";

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
          {greeting || "Welcome back."}
        </h1>
        <p className="mt-2 max-w-[52ch] font-serif text-[1.1rem] leading-[1.55] text-ink-muted">
          {summaryLine(active.length, completed.length)}
        </p>
        {error && (
          <p className="mt-4 max-w-[60ch] border border-red-800/30 bg-red-50/40 px-3 py-2 font-sans text-[12px] text-[#a9453c]">
            {error}
          </p>
        )}
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
            {cases === null ? "loading" : `${active.length} active`}
          </span>
        </div>
        {cases === null ? (
          <ul className="divide-y divide-rule border-y border-rule">
            {Array.from({ length: 2 }).map((_, i) => (
              <li
                key={i}
                className="grid grid-cols-[1fr_auto] items-center gap-6 py-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="h-5 w-72 max-w-full bg-paper-deep" />
                  <div className="h-3 w-48 max-w-full bg-paper-deep/70" />
                </div>
                <div className="h-5 w-24 bg-paper-deep" />
              </li>
            ))}
          </ul>
        ) : active.length === 0 ? (
          <EmptyState
            label="No active appeals yet."
            hint="Start a new case to see it appear here in real time."
          />
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {active.map((c, i) => (
              <CaseRow key={c.id} caseItem={c} index={i} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <Eyebrow>Completed</Eyebrow>
          <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
            {cases === null ? "" : `${completed.length} resolved`}
          </span>
        </div>
        {completed.length === 0 ? (
          <EmptyState label="Nothing resolved yet." hint="Outcomes will land here once insurers respond." />
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {completed.map((c, i) => (
              <CaseRow key={c.id} caseItem={c} index={i} muted />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function summaryLine(active: number, completed: number) {
  if (active === 0 && completed === 0) {
    return "No appeals yet — drop in your first denial letter to begin.";
  }
  if (active === 0) {
    return `${completed} appeal${completed === 1 ? "" : "s"} resolved. Start another when you're ready.`;
  }
  return `${active} active appeal${active === 1 ? "" : "s"}, ${completed} resolved. Begin when you're ready.`;
}

function EmptyState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="border-y border-rule px-4 py-10 text-center">
      <p className="font-serif text-[1.05rem] text-ink">{label}</p>
      <p className="mt-2 font-sans text-[12px] text-ink-muted">{hint}</p>
    </div>
  );
}

function CaseRow({
  caseItem,
  index,
  muted,
}: {
  caseItem: Summary;
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
