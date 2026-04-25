"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Waveform } from "@/components/ui/Waveform";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { transcribeRecording } from "@/lib/intake/transcribe-audio";

type Mode = "idle" | "recording" | "processing" | "done" | "error";

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function VoiceStage({ onContinue }: { onContinue: (t: string) => void }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useChat, setUseChat] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const tickRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (mode !== "recording") return;
    tickRef.current = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [mode]);

  const cleanupMedia = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  const start = async () => {
    setErrorMessage(null);
    setTranscript("");
    transcriptRef.current = "";
    setSeconds(0);
    setMode("recording");

    const SR = getSpeechRecognitionCtor();
    const useSpeech = Boolean(SR);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start(250);

      if (useSpeech && SR) {
        const r = new SR();
        r.continuous = true;
        r.interimResults = true;
        r.lang = "en-US";
        let built = "";
        r.onresult = (event: SpeechRecognitionEvent) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            built += event.results[i]![0]!.transcript;
          }
          const t = built.trim();
          transcriptRef.current = t;
          setTranscript(t);
        };
        r.onerror = () => {
          /* non-fatal — we still have MediaRecorder */
        };
        r.start();
        recognitionRef.current = r;
      }
    } catch {
      setMode("error");
      setErrorMessage("Microphone access was blocked. Use “type instead” below.");
    }
  };

  const stop = async () => {
    if (mode !== "recording") return;

    recognitionRef.current?.stop();
    recognitionRef.current = null;
    await new Promise((r) => setTimeout(r, 200));

    const mr = mediaRecorderRef.current;
    const stream = mediaStreamRef.current;
    if (mr && mr.state !== "inactive") {
      await new Promise<void>((resolve) => {
        mr.onstop = () => resolve();
        mr.stop();
      });
    }
    stream?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;

    const speechText = transcriptRef.current.trim();
    if (speechText.length >= 4) {
      setMode("done");
      return;
    }

    const blob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || "audio/webm",
    });
    chunksRef.current = [];

    if (blob.size < 400) {
      setMode("error");
      setErrorMessage("Recording was too short, or speech was not detected. Try again or type below.");
      return;
    }

    setMode("processing");
    try {
      const text = await transcribeRecording(blob);
      setTranscript(text);
      setMode("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transcription failed.";
      if (/501|OPENAI_API_KEY|not set on the API/i.test(msg)) {
        setMode("error");
        setErrorMessage(
          "No live speech detected and the API has no OPENAI_API_KEY for Whisper. Use Chrome for speech-to-text, or type your context below.",
        );
      } else {
        setMode("error");
        setErrorMessage(msg);
      }
    }
  };

  const submitChat = () => {
    if (!chatMsg.trim()) return;
    onContinue(chatMsg.trim());
  };

  const submitVoice = () => {
    const t = transcript.trim();
    if (!t) return;
    onContinue(t);
  };

  return (
    <div className="grid grid-cols-1 gap-14 md:grid-cols-[1fr_0.9fr] md:gap-20">
      <div className="flex flex-col gap-4">
        <Eyebrow>Step 02</Eyebrow>
        <h1 className="max-w-[22ch] font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-tight text-ink">
          In your own words — what happened?
        </h1>
        <p className="max-w-[44ch] font-serif text-[1.05rem] leading-[1.6] text-ink-muted">
          We listen in the browser (Chrome speech API) and keep a backup recording for Whisper on
          the API when <code className="text-[11px] text-ink">OPENAI_API_KEY</code> is set.
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
                  onClick={() => {
                    if (mode === "recording") void stop();
                    else void start();
                  }}
                  aria-pressed={mode === "recording"}
                  aria-label={mode === "recording" ? "Stop recording" : "Start recording"}
                  disabled={mode === "processing"}
                  className={cn(
                    "group relative flex h-20 w-20 items-center justify-center rounded-full border transition-all duration-300 ease-editorial",
                    mode === "recording"
                      ? "border-ochre bg-ochre text-paper"
                      : "border-ink/30 text-ink hover:border-ochre hover:text-ochre",
                    mode === "processing" && "opacity-40",
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
                {mode === "processing" && (
                  <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                    Sending audio to API…
                  </p>
                )}
                {(mode === "done" || mode === "error") && (
                  <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                    {mode === "done" ? `${formatTime(seconds)} captured` : "Recording stopped"}
                  </p>
                )}
              </div>

              {mode === "error" && errorMessage && (
                <p className="border border-rule bg-paper-deep/40 px-4 py-3 font-serif text-[0.95rem] leading-[1.5] text-ink">
                  {errorMessage}
                </p>
              )}

              {(mode === "done" || (mode === "error" && transcript.trim())) && transcript.trim() && (
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

              {mode === "done" && transcript.trim() && (
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
