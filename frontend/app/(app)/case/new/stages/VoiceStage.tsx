"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Waveform } from "@/components/ui/Waveform";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";

const SAMPLE_TRANSCRIPT =
  "My patient is a 47-year-old with a BMI of 41 and longstanding type 2 diabetes. She's been on metformin plus a DPP-4 inhibitor for three years with poor control — A1C last month was 9.2. I started her on semaglutide four months ago and she's lost 18 pounds with her A1C down to 7.3. Anthem denied the refill as not medically necessary. This is textbook medical necessity, and I'd like to appeal.";

type Mode = "idle" | "recording" | "done";

export function VoiceStage({ onContinue }: { onContinue: (t: string) => void }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [useChat, setUseChat] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== "recording") return;
    tickRef.current = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [mode]);

  const start = () => {
    setMode("recording");
    setSeconds(0);
    setTranscript("");
  };

  const stop = () => {
    setMode("done");
    let i = 0;
    const id = window.setInterval(() => {
      i += 3;
      setTranscript(SAMPLE_TRANSCRIPT.slice(0, i));
      if (i >= SAMPLE_TRANSCRIPT.length) window.clearInterval(id);
    }, 25);
  };

  const submitChat = () => {
    if (!chatMsg.trim()) return;
    onContinue(chatMsg.trim());
  };

  const submitVoice = () => {
    onContinue(transcript || SAMPLE_TRANSCRIPT);
  };

  return (
    <div className="grid grid-cols-1 gap-14 md:grid-cols-[1fr_0.9fr] md:gap-20">
      <div className="flex flex-col gap-4">
        <Eyebrow>Step 02</Eyebrow>
        <h1 className="max-w-[22ch] font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-tight text-ink">
          In your own words — what happened?
        </h1>
        <p className="max-w-[44ch] font-serif text-[1.05rem] leading-[1.6] text-ink-muted">
          Tap the microphone and talk it through. The dosages, the failures,
          the evidence you have. Rambling is fine; we'll sort it.
        </p>
        <button
          type="button"
          onClick={() => setUseChat((v) => !v)}
          className="mt-4 self-start font-sans text-[11px] uppercase tracking-[0.22em] text-ochre transition-colors duration-200 ease-editorial hover:text-ink"
        >
          {useChat ? "— or record instead" : "— prefer to type? Use chat"}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {!useChat ? (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-6"
            >
              <div className="relative flex h-[220px] w-full flex-col items-center justify-center gap-6 border border-rule bg-paper-deep/40 px-8">
                <button
                  type="button"
                  onClick={mode === "recording" ? stop : start}
                  aria-pressed={mode === "recording"}
                  aria-label={mode === "recording" ? "Stop recording" : "Start recording"}
                  className={cn(
                    "group relative flex h-20 w-20 items-center justify-center rounded-full border transition-all duration-300 ease-editorial",
                    mode === "recording"
                      ? "border-ochre bg-ochre text-paper"
                      : "border-ink/30 text-ink hover:border-ochre hover:text-ochre",
                  )}
                >
                  {mode === "recording" ? (
                    <span className="h-5 w-5 rounded-[2px] bg-paper" />
                  ) : (
                    <MicIcon />
                  )}
                  {mode === "recording" && (
                    <motion.span
                      className="absolute inset-0 rounded-full border border-ochre"
                      animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </button>
                {mode === "recording" && (
                  <>
                    <div className="h-12 w-[240px]">
                      <Waveform active bars={28} />
                    </div>
                    <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                      {formatTime(seconds)} · listening
                    </p>
                  </>
                )}
                {mode === "idle" && (
                  <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
                    Tap to begin
                  </p>
                )}
                {mode === "done" && (
                  <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                    {formatTime(seconds)} captured
                  </p>
                )}
              </div>

              {mode === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="border border-rule bg-paper px-6 py-5"
                >
                  <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                    Transcript
                  </p>
                  <p className="mt-3 font-serif text-[0.98rem] leading-[1.65] text-ink">
                    {transcript}
                  </p>
                </motion.div>
              )}

              {mode === "done" && (
                <div className="flex justify-end">
                  <Button variant="primary" onClick={submitVoice}>
                    Continue
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-4 border border-rule bg-paper px-6 py-6"
            >
              <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                Type the context
              </p>
              <Textarea
                rows={8}
                placeholder="Tell us what the patient has been through — treatments tried, dosages, A1C or vitals, anything else Anthem's reviewer should see."
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                className="min-h-[200px]"
              />
              <div className="flex justify-end">
                <Button variant="primary" onClick={submitChat} disabled={!chatMsg.trim()}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect
        x="7.5"
        y="2"
        width="7"
        height="12"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4 11v0a7 7 0 0 0 14 0M11 18v2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
