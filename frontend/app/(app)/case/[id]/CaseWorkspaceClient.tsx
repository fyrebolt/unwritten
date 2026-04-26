"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { workspaceScript } from "@/lib/mock/agents";
import { agentFocusSchedule } from "@/lib/mock/denial";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { ClientCase } from "@/lib/cases/client";
import { AgentFeed } from "./panels/AgentFeed";
import { DenialViewer } from "./panels/DenialViewer";
import { LiveLetter } from "./panels/LiveLetter";
import { AgentConfigDrawer } from "./panels/AgentConfigDrawer";

const SIMULATION_SECONDS = 20;

export function CaseWorkspaceClient({
  caseId,
  title,
  seed,
}: {
  caseId: string;
  title: string;
  seed?: ClientCase;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const startRef = useRef<number | null>(null);
  const isReal = Boolean(seed);

  useEffect(() => {
    let raf = 0;
    const loop = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const e = (ts - startRef.current) / 1000;
      setElapsed(e);
      if (e >= SIMULATION_SECONDS) {
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const visibleEvents = useMemo(
    () => workspaceScript.filter((e) => e.atSeconds <= elapsed),
    [elapsed],
  );

  const activeAgent = useMemo(() => {
    for (let i = workspaceScript.length - 1; i >= 0; i--) {
      const e = workspaceScript[i];
      if (
        elapsed >= e.atSeconds &&
        elapsed < e.atSeconds + e.durationMs / 1000
      ) {
        return e;
      }
    }
    return null;
  }, [elapsed]);

  const currentFocus = useMemo(() => {
    for (let i = agentFocusSchedule.length - 1; i >= 0; i--) {
      if (elapsed >= agentFocusSchedule[i].atSeconds) {
        return agentFocusSchedule[i].highlight;
      }
    }
    return null;
  }, [elapsed]);

  const draftingStart = 12.4;
  const letterProgress = Math.max(0, elapsed - draftingStart);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <header className="flex items-center justify-between border-b border-rule px-6 py-5 md:px-10 lg:px-14">
        <div className="flex flex-col gap-1">
          <Eyebrow>Case · {shortenCaseId(caseId)}</Eyebrow>
          <h1 className="font-serif text-[1.6rem] leading-[1.15] tracking-tight text-ink">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusLozenge elapsed={elapsed} done={done} />
          <Button variant="ghost" size="sm" onClick={() => setConfigOpen(true)}>
            Agent config
          </Button>
          {isReal && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/case/${caseId}/live`}>Live agents →</Link>
            </Button>
          )}
          <Button variant="primary" size="sm" asChild>
            <Link
              href={done ? `/case/${caseId}/review` : "#"}
              aria-disabled={!done}
              onClick={(e) => !done && e.preventDefault()}
              className={done ? "" : "pointer-events-none opacity-40"}
            >
              {done ? "Review draft →" : "Drafting…"}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 divide-rule lg:grid-cols-[minmax(320px,0.9fr)_minmax(400px,1.1fr)_minmax(420px,1.2fr)] lg:divide-x">
        <div className="min-h-[600px] overflow-y-auto border-b border-rule px-6 py-8 lg:border-b-0 lg:px-8">
          <AgentFeed
            visible={visibleEvents}
            activeAgent={activeAgent?.agent}
            elapsed={elapsed}
            done={done}
          />
        </div>
        <div className="min-h-[600px] overflow-y-auto border-b border-rule px-6 py-8 lg:border-b-0 lg:px-8">
          <DenialViewer focus={currentFocus} done={done} />
        </div>
        <div className="min-h-[600px] overflow-y-auto px-6 py-8 lg:px-8">
          <LiveLetter
            startAt={draftingStart}
            elapsed={elapsed}
            letterProgress={letterProgress}
            done={done}
          />
        </div>
      </div>

      <AgentConfigDrawer
        open={configOpen}
        onOpenChange={setConfigOpen}
        onApply={() => setConfigOpen(false)}
      />
    </div>
  );
}

function shortenCaseId(id: string) {
  if (id.length <= 8) return id.toUpperCase();
  if (id.startsWith("case_")) return id.replace("case_", "").toUpperCase();
  return `${id.slice(0, 4)}…${id.slice(-4)}`.toUpperCase();
}

function StatusLozenge({ elapsed, done }: { elapsed: number; done: boolean }) {
  const label = done
    ? "Draft ready"
    : elapsed < 2.9
      ? "Intake"
      : elapsed < 9.8
        ? "Retrieving policy & evidence"
        : elapsed < 12.4
          ? "Cross-referencing"
          : elapsed < 17.2
            ? "Drafting"
            : "Preparing delivery";
  return (
    <span className="hidden items-center gap-2 border border-rule px-3 py-1.5 font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted md:inline-flex">
      {!done && (
        <motion.span
          className="h-1 w-1 rounded-full bg-ochre"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {done && <span className="h-1 w-1 rounded-full bg-ochre" />}
      {label}
    </span>
  );
}
