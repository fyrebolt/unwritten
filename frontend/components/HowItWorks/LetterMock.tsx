"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { editorialEase } from "@/lib/motion";

// The full letter body, broken into sentences so we can attach citations.
const sentences: Array<{ text: string; cite?: number }> = [
  {
    text: "We write on behalf of the above-referenced member to appeal the denial of coverage issued on March 7, 2026.",
  },
  {
    text: "The denial asserts that the requested procedure was not medically necessary; the member's treating surgeon has certified otherwise, supported by imaging and prior conservative treatment.",
    cite: 1,
  },
  {
    text: "The denial further cites a missing prior authorization; however, the plan's own utilization management policy, §4.2, waives this requirement under the clinical criteria met by the member's condition.",
    cite: 2,
  },
  {
    text: "Under ERISA §503 and 29 CFR 2560.503-1, we respectfully request that the denial be overturned and coverage reinstated.",
    cite: 3,
  },
];

export function LetterMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const [charCount, setCharCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const fullText = sentences.map((s) => s.text).join(" ");

  useEffect(() => {
    if (!inView) {
      setCharCount(0);
      setStatus("idle");
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 4; // ~60 cps at 15ms tick feels confident, not jittery
      if (i >= fullText.length) {
        i = fullText.length;
        window.clearInterval(id);
        window.setTimeout(() => setStatus("sending"), 400);
        window.setTimeout(() => setStatus("sent"), 2600);
      }
      setCharCount(i);
    }, 15);
    return () => window.clearInterval(id);
  }, [inView, fullText.length]);

  // Build the visible segments with superscripts as each sentence completes.
  const rendered = (() => {
    let consumed = 0;
    const out: React.ReactNode[] = [];
    sentences.forEach((s, i) => {
      if (consumed >= charCount) {
        return;
      }
      const end = consumed + s.text.length + 1; // +1 for space
      const visible = s.text.slice(0, Math.max(0, charCount - consumed));
      const isComplete = charCount >= consumed + s.text.length;
      out.push(
        <span key={i}>
          {visible}
          {isComplete && s.cite ? (
            <motion.sup
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: editorialEase }}
              className="mx-[0.1em] text-[0.68em] text-ochre"
            >
              {s.cite}
            </motion.sup>
          ) : null}
          {isComplete ? " " : null}
        </span>,
      );
      consumed = end;
    });
    return out;
  })();

  const done = charCount >= fullText.length;

  return (
    <div ref={ref} className="relative w-full">
      {/* Paper */}
      <div className="relative overflow-hidden rounded-sm border border-rule bg-[#FBF8F1] px-9 pb-10 pt-8 shadow-[0_30px_60px_-30px_rgba(28,22,12,0.22)]">
        {/* Letterhead */}
        <div className="mb-6 flex items-start justify-between border-b border-rule pb-5">
          <div>
            <p className="font-serif text-[1.5rem] leading-none tracking-tight text-ink">
              Unwritten<span className="text-ochre">.</span>
            </p>
            <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Office of Member Advocacy
            </p>
          </div>
          <div className="text-right font-sans text-[10px] tracking-[0.12em] text-ink-muted">
            <p>APPEAL · 847-221-B</p>
            <p>DATE · 03.14.2026</p>
            <p>VIA · FAX / USPS</p>
          </div>
        </div>

        <p className="mb-5 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-ink">
          Formal appeal — member denial
        </p>

        {/* Typed body */}
        <div
          className="min-h-[14rem] font-serif text-[0.9375rem] leading-[1.7] text-ink"
          aria-live="polite"
        >
          {rendered}
          {!done && <span className="caret" aria-hidden="true" />}
        </div>

        {/* Citations footer */}
        {charCount > 40 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: editorialEase }}
            className="mt-6 border-t border-rule pt-4 font-sans text-[10px] leading-[1.5] text-ink-muted"
          >
            <p>
              <span className="text-ochre">¹</span> Treating physician letter,
              Dr. M. Reyes, 03.02.2026.
            </p>
            <p>
              <span className="text-ochre">²</span> Plan document §4.2 —
              utilization management criteria.
            </p>
            <p>
              <span className="text-ochre">³</span> ERISA §503; 29 CFR
              2560.503-1 (appeal procedures).
            </p>
          </motion.div>
        )}

        {/* Status strip */}
        <div className="mt-6 flex items-center justify-between border-t border-rule pt-4 font-sans text-[10px] uppercase tracking-[0.18em]">
          <span className="text-ink-faint">{done ? "Draft complete" : "Drafting…"}</span>
          <StatusDot status={status} />
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "idle" | "sending" | "sent" }) {
  const label = status === "idle" ? "Awaiting send" : status === "sending" ? "Sending via fax" : "Sent — 03.14 14:22";
  const dotColor =
    status === "sent" ? "var(--ochre)" : status === "sending" ? "var(--ink)" : "rgba(26,26,23,0.25)";
  return (
    <span className="inline-flex items-center gap-2 text-ink-muted">
      <span className="relative inline-flex h-[6px] w-[6px]">
        <span
          className={`absolute inset-0 rounded-full ${status === "sending" ? "animate-ink-pulse" : ""}`}
          style={{ background: dotColor }}
        />
      </span>
      {label}
    </span>
  );
}
