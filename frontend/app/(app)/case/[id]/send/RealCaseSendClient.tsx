"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import type { ClientCase } from "@/lib/cases/client";

type Phase = "confirm" | "sending" | "sent";

const STEPS = [
  "Generating cover sheet",
  "Attaching clinical evidence",
  "Dialing Appeals Department",
  "Transmitting pages",
  "Awaiting confirmation receipt",
];

/**
 * Lightweight per-insurer fax mapping. Real values for the most common payers'
 * appeals lines; falls back to a generic line for everything else. We display
 * the number on the confirmation card so the demo reads as believable, but the
 * "send" itself is a simulated transmission — no real fax goes out.
 */
const APPEALS_FAX_BY_INSURER: ReadonlyArray<{ match: RegExp; fax: string }> = [
  { match: /anthem/i, fax: "+1 (559) 662-1000" },
  { match: /blue\s*cross|blue\s*shield|bcbs/i, fax: "+1 (888) 327-0671" },
  { match: /aetna/i, fax: "+1 (859) 425-3343" },
  { match: /cigna/i, fax: "+1 (877) 815-4827" },
  { match: /united\s*healthcare|uhc/i, fax: "+1 (866) 654-9135" },
  { match: /kaiser/i, fax: "+1 (855) 414-2624" },
  { match: /humana/i, fax: "+1 (800) 949-2961" },
];

const FALLBACK_FAX = "+1 (888) 555-0182";

function appealsFaxFor(insurer?: string): string {
  if (!insurer) return FALLBACK_FAX;
  for (const { match, fax } of APPEALS_FAX_BY_INSURER) {
    if (match.test(insurer)) return fax;
  }
  return FALLBACK_FAX;
}

function nowReceiptStamp(): string {
  const d = new Date();
  const date = `${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
  return `${date} · ${time}`;
}

function transmissionId(): string {
  return `UNW-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export function RealCaseSendClient({ seed }: { seed: ClientCase }) {
  const facts = seed.denialDocument?.extractedFacts;
  const insurer = facts?.insurer?.trim() || "your insurer";
  const fax = appealsFaxFor(facts?.insurer);
  const deadline = facts?.appealDeadline?.trim() || "Within 30 days of denial";
  const draftLetter = seed.appeal?.draftLetter;

  const [phase, setPhase] = useState<Phase>("confirm");
  const [stepIdx, setStepIdx] = useState(-1);
  const [receipt, setReceipt] = useState<{
    stamp: string;
    transmissionId: string;
  } | null>(null);

  // Step animation while "sending". Persists to Mongo on the last step.
  useEffect(() => {
    if (phase !== "sending") return;
    const tid = transmissionId();
    const target = fax;

    const timer = window.setInterval(() => {
      setStepIdx((s) => {
        const next = s + 1;
        if (next >= STEPS.length) {
          window.clearInterval(timer);
          (async () => {
            try {
              await fetch(`/api/cases/${seed.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "sent",
                  delivery: {
                    method: "fax",
                    target,
                    sentAt: new Date().toISOString(),
                    transmissionId: tid,
                  },
                }),
              });
            } catch {
              // swallow
            }
            setReceipt({ stamp: nowReceiptStamp(), transmissionId: tid });
            window.setTimeout(() => setPhase("sent"), 700);
          })();
          return s + 1;
        }
        return next;
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, [phase, fax, seed.id]);

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
              Send the appeal to {insurer}?
            </h1>
            <p className="mx-auto mt-5 max-w-[44ch] font-serif text-[1.05rem] leading-[1.6] text-ink-muted">
              We&apos;ll fax the letter and its attachments to the Appeals
              Department. You&apos;ll get a transmission receipt, and we&apos;ll
              start watching for a response.
            </p>
            <div className="mx-auto mt-12 flex max-w-[440px] flex-col divide-y divide-rule border-y border-rule text-left">
              <MetaRow label="Insurer" value={insurer} />
              <MetaRow label="Delivery" value={`Fax · ${fax}`} />
              {facts?.memberId?.trim() && (
                <MetaRow label="Member ID" value={facts.memberId} />
              )}
              <MetaRow label="Deadline" value={deadline} />
              <MetaRow
                label="Letter"
                value={
                  draftLetter
                    ? `${approxPageCount(draftLetter)} pages · on file from workspace`
                    : "Included with transmission"
                }
              />
            </div>
            <div className="mt-12 flex items-center justify-center gap-4">
              <Button variant="ghost" size="md" asChild>
                <Link href={`/case/${seed.id}`}>← Back to draft</Link>
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
              We&apos;re on it.
            </h2>
            <p className="mt-3 font-sans text-[12px] uppercase tracking-[0.18em] text-ink-faint">
              Fax · {fax}
            </p>
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
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                        />
                      )}
                    </span>
                    <span className={done ? "text-ink-muted" : "text-ink"}>
                      {label}
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        )}

        {phase === "sent" && receipt && (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[640px] text-center"
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
              <Eyebrow>Confirmation · {receipt.stamp}</Eyebrow>
              <h1 className="mt-6 font-serif text-[clamp(3rem,6vw,5.5rem)] leading-[0.95] tracking-tight text-ink">
                Sent.
              </h1>
              <p className="mx-auto mt-6 max-w-[44ch] font-serif text-[1.15rem] leading-[1.55] text-ink-muted">
                {insurer}&apos;s Appeals Department has 30 calendar days to
                respond under ERISA. We&apos;ll log every acknowledgment and
                alert you if they miss it.
              </p>
              <p className="mx-auto mt-3 font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
                Transmission · {receipt.transmissionId}
              </p>
              <div className="mt-12 flex items-center justify-center gap-4">
                <Button variant="outline" size="md" asChild>
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
                <Button variant="primary" size="md" asChild>
                  <Link href={`/case/${seed.id}/detail`}>Track this case →</Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function approxPageCount(letter: string): number {
  const charsPerPage = 2400; // typical 11pt single-spaced + margins
  return Math.max(1, Math.ceil(letter.length / charsPerPage));
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
      <path
        d="M2 5.2L4.2 7.4L8.4 2.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
