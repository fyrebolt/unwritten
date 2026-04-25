"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { MockCase } from "@/lib/mock/cases";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";

type Phase = "confirm" | "sending" | "sent";

const STEPS = [
  "Generating cover sheet",
  "Attaching clinical evidence",
  "Dialing Anthem Appeals Dept — fax +1 (559) 662-1000",
  "Transmitting 6 pages",
  "Awaiting confirmation receipt",
];

export function SendClient({ caseItem }: { caseItem: MockCase }) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [stepIdx, setStepIdx] = useState(-1);

  useEffect(() => {
    if (phase !== "sending") return;
    const t = window.setInterval(() => {
      setStepIdx((s) => {
        if (s + 1 >= STEPS.length) {
          window.clearInterval(t);
          window.setTimeout(() => setPhase("sent"), 900);
          return s + 1;
        }
        return s + 1;
      });
    }, 900);
    return () => window.clearInterval(t);
  }, [phase]);

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden px-6 py-16">
      <AnimatePresence mode="wait">
        {phase === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[560px] text-center"
          >
            <Eyebrow>Ready to send</Eyebrow>
            <h1 className="mt-4 font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] tracking-tight text-ink">
              Send the appeal to {caseItem.insurer}?
            </h1>
            <p className="mx-auto mt-5 max-w-[44ch] font-serif text-[1.05rem] leading-[1.6] text-ink-muted">
              We'll fax the letter and its attachments to the Appeals Department.
              You'll get a transmission receipt, and we'll start watching for a response.
            </p>
            <div className="mx-auto mt-12 flex max-w-[420px] flex-col divide-y divide-rule border-y border-rule text-left">
              <MetaRow label="Insurer" value={caseItem.insurer} />
              <MetaRow label="Delivery" value="Fax · +1 (559) 662-1000" />
              <MetaRow label="Deadline" value={caseItem.appealDeadline} />
            </div>
            <div className="mt-12 flex items-center justify-center gap-4">
              <Button variant="ghost" size="md" asChild>
                <Link href={`/case/${caseItem.id}/review`}>← Back to review</Link>
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setPhase("sending");
                  setStepIdx(0);
                }}
              >
                Send appeal
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "sending" && (
          <motion.div
            key="sending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[520px] text-left"
          >
            <Eyebrow>Sending</Eyebrow>
            <h2 className="mt-4 font-serif text-[clamp(1.75rem,3vw,2.4rem)] leading-[1.1] tracking-tight text-ink">
              We're on it.
            </h2>
            <ol className="mt-10 flex flex-col gap-5">
              {STEPS.map((label, i) => {
                const done = i < stepIdx;
                const active = i === stepIdx;
                return (
                  <motion.li
                    key={label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: i <= stepIdx ? 1 : 0.25, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-4 font-sans text-[13px] text-ink"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        done
                          ? "inline-flex h-4 w-4 items-center justify-center rounded-full bg-ochre text-paper"
                          : active
                            ? "relative inline-block h-2 w-2 rounded-full bg-ochre"
                            : "inline-block h-2 w-2 rounded-full border border-rule"
                      }
                    >
                      {done && <CheckIcon />}
                      {active && (
                        <motion.span
                          className="absolute inset-0 rounded-full bg-ochre"
                          animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                    </span>
                    <span className={done ? "text-ink-muted" : "text-ink"}>{label}</span>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        )}

        {phase === "sent" && (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[620px] text-center"
          >
            <motion.div
              className="absolute inset-x-0 -top-24 mx-auto h-64 w-64 rounded-full bg-ochre/20 blur-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.1 }}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <Eyebrow>Confirmation · 03.14.26 · 14:22</Eyebrow>
              <h1 className="mt-6 font-serif text-[clamp(3rem,6vw,5.5rem)] leading-[0.95] tracking-tight text-ink">
                Sent.
              </h1>
              <p className="mx-auto mt-6 max-w-[42ch] font-serif text-[1.15rem] leading-[1.55] text-ink-muted">
                Anthem's Appeals Department has 30 calendar days to respond under ERISA.
                We'll log every acknowledgment and alert you if they miss it.
              </p>
              <div className="mt-12 flex items-center justify-center gap-4">
                <Button variant="outline" size="md" asChild>
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
                <Button variant="primary" size="md" asChild>
                  <Link href={`/case/${caseItem.id}/detail`}>Track this case →</Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-4 py-4">
      <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted">
        {label}
      </span>
      <span className="font-serif text-[1rem] text-ink">{value}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 5.2L4.2 7.4L8.4 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
