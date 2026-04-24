"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { editorialEase } from "@/lib/motion";

const transcriptLines = [
  "My surgery was scheduled for March 3rd…",
  "Aetna denied it four days before.",
  "They said it was not medically necessary.",
  "My surgeon disagrees. I have the MRI.",
];

export function VoiceMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (!inView) {
      setVisibleLines(0);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setVisibleLines(i);
      if (i >= transcriptLines.length) window.clearInterval(id);
    }, 1100);
    return () => window.clearInterval(id);
  }, [inView]);

  return (
    <div ref={ref} className="relative w-full">
      {/* Card */}
      <div className="relative rounded-sm border border-rule bg-paper-deep/70 p-8 shadow-[0_30px_60px_-30px_rgba(28,22,12,0.18)] backdrop-blur-[1px]">
        {/* Card header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MicIcon />
            <span className="font-sans text-eyebrow uppercase tracking-eyebrow text-ink-muted">
              Listening
            </span>
          </div>
          <span className="font-sans text-[11px] text-ink-faint tabular-nums">
            00:14
          </span>
        </div>

        {/* Waveform */}
        <div className="mb-10 flex h-14 items-center gap-[6px]">
          {[...Array(32)].map((_, i) => (
            <span
              key={i}
              className="wave-bar"
              style={{
                height: `${20 + ((i * 17) % 36)}px`,
                animationDelay: `${(i % 6) * 0.09}s`,
                opacity: i > 18 ? 0.3 : 1,
                background: i % 7 === 0 ? "var(--ochre)" : "var(--ink)",
              }}
            />
          ))}
        </div>

        {/* Transcription */}
        <div className="space-y-3 border-t border-rule pt-6">
          <p className="font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint">
            Transcription
          </p>
          <div className="min-h-[9rem] space-y-2">
            {transcriptLines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: i < visibleLines ? 1 : 0,
                  y: i < visibleLines ? 0 : 8,
                }}
                transition={{ duration: 0.5, ease: editorialEase }}
                className="font-serif text-[1.0625rem] leading-[1.5] text-ink"
              >
                {line}
              </motion.p>
            ))}
          </div>
        </div>

        {/* Corner fleurons */}
        <Corner className="left-3 top-3" />
        <Corner className="right-3 top-3 rotate-90" />
        <Corner className="bottom-3 right-3 rotate-180" />
        <Corner className="bottom-3 left-3 -rotate-90" />
      </div>

      {/* Caption below */}
      <p className="mt-6 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint">
        · Voice intake — no typing required
      </p>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="text-ochre"
      aria-hidden="true"
    >
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M9 21h6" />
    </svg>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute block h-3 w-3 border-l border-t border-ink/20 ${className}`}
    />
  );
}
