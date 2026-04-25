"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const BACKEND = process.env.NEXT_PUBLIC_AGENTS_API ?? "http://localhost:8788";

// ── types ────────────────────────────────────────────────────────────────────

interface CaseData {
  insurer?: string;
  medication?: string;
  denial_reason?: string;
  [k: string]: string | undefined;
}

interface AnalysisResult {
  ok: boolean;
  case_data?: CaseData;
  policy_finding?: string;
  evidence_finding?: string;
  letter?: string;
  error?: string;
}

interface DebugInfo {
  elapsed: number;
  status: number;
  raw: unknown;
}

type RunStatus = "idle" | "loading" | "done" | "error";

// ── helpers ───────────────────────────────────────────────────────────────────

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function fade(delay = 0) {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease, delay },
  };
}

// ── main component ─────────────────────────────────────────────────────────

export function AgentTestClient() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [voice, setVoice] = useState("");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // ── dropzone ──────────────────────────────────────────────────────────────

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: status === "loading",
  });

  // ── run ───────────────────────────────────────────────────────────────────

  const run = async () => {
    if (!file && !message.trim()) return;
    setStatus("loading");
    setResult(null);
    setDebug(null);

    const body = new FormData();
    if (file) body.append("file", file);
    if (message.trim()) body.append("message", message.trim());
    if (voice.trim()) body.append("voice", voice.trim());

    const t0 = Date.now();
    try {
      const res = await fetch(`${BACKEND}/v1/intake`, { method: "POST", body });
      const elapsed = Date.now() - t0;
      const json: AnalysisResult = await res.json();
      setDebug({ elapsed, status: res.status, raw: json });
      if (json.ok) {
        setResult(json);
        setStatus("done");
      } else {
        setResult(json);
        setStatus("error");
      }
    } catch (err) {
      const elapsed = Date.now() - t0;
      const msg = err instanceof Error ? err.message : String(err);
      setDebug({ elapsed, status: 0, raw: { error: msg } });
      setResult({ ok: false, error: msg });
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setMessage("");
    setVoice("");
    setStatus("idle");
    setResult(null);
    setDebug(null);
    setShowDebug(false);
  };

  const canRun = (!!file || !!message.trim()) && status !== "loading";

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[88rem] px-6 py-14 md:px-10 md:py-20 lg:px-14">

      {/* header */}
      <motion.header {...fade(0)} className="mb-14 flex flex-col gap-2">
        <Eyebrow>Dev · Agent Test</Eyebrow>
        <h1 className="font-serif text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-tight text-ink">
          Test the pipeline.
        </h1>
        <p className="mt-1 max-w-[52ch] font-serif text-[1.05rem] leading-[1.6] text-ink-muted">
          Upload a denial letter, add context, and run the full agent chain — extract, research, draft.
        </p>
      </motion.header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr]">

        {/* ── left: inputs ── */}
        <motion.div {...fade(0.06)} className="flex flex-col gap-6">

          {/* upload zone */}
          <div className="flex flex-col gap-2">
            <label className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              Denial letter (PDF)
            </label>
            <div
              {...getRootProps()}
              className={cn(
                "relative flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-rule bg-paper-deep/40 px-6 text-center transition-colors duration-200 ease-editorial",
                isDragActive && "border-ochre bg-ochre/5",
                file && "border-ink/20 bg-paper-deep/60",
                status === "loading" && "cursor-default opacity-60",
              )}
            >
              <input {...getInputProps()} />
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="has-file"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <FileIcon />
                    <p className="font-sans text-[13px] text-ink">{file.name}</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink-faint transition-colors duration-150 hover:text-ochre"
                    >
                      Remove
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <UploadIcon />
                    <p className="font-serif text-[1rem] leading-[1.3] text-ink">
                      {isDragActive ? "Drop it here." : "Drop PDF or click to browse."}
                    </p>
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                      Optional — text message is enough
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* message */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="message"
              className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted"
            >
              Message / context
            </label>
            <textarea
              id="message"
              ref={textRef}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={status === "loading"}
              placeholder="e.g. Anthem denied my Ozempic, step therapy reason…"
              className={cn(
                "w-full resize-none border-0 border-b border-rule bg-transparent py-2 font-sans text-[15px] text-ink outline-none transition-[border-color,border-width] duration-200 ease-editorial",
                "placeholder:text-ink-faint focus:border-b-2 focus:border-ochre",
                status === "loading" && "opacity-60",
              )}
            />
          </div>

          {/* voice transcription */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="voice"
              className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted"
            >
              Voice transcription
              <span className="ml-2 text-ink-faint normal-case tracking-normal">optional</span>
            </label>
            <textarea
              id="voice"
              rows={2}
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              disabled={status === "loading"}
              placeholder="Paste voice transcription here…"
              className={cn(
                "w-full resize-none border-0 border-b border-rule bg-transparent py-2 font-sans text-[15px] text-ink outline-none transition-[border-color,border-width] duration-200 ease-editorial",
                "placeholder:text-ink-faint focus:border-b-2 focus:border-ochre",
                status === "loading" && "opacity-60",
              )}
            />
          </div>

          {/* actions */}
          <div className="mt-2 flex items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              disabled={!canRun}
              onClick={run}
              className="min-w-[140px]"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Analyzing…
                </span>
              ) : "Analyze"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowDebug((v) => !v)}
              className={cn(showDebug && "border-ochre text-ochre")}
            >
              Debug {showDebug ? "▲" : "▼"}
            </Button>

            {status !== "idle" && (
              <button
                type="button"
                onClick={reset}
                className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink-faint transition-colors duration-150 hover:text-ink"
              >
                Reset
              </button>
            )}
          </div>
        </motion.div>

        {/* ── right: results ── */}
        <motion.div {...fade(0.1)} className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.45 }}
                exit={{ opacity: 0 }}
                className="flex h-36 items-center justify-center border border-dashed border-rule"
              >
                <p className="font-serif text-[1rem] text-ink-muted">
                  Results will appear here.
                </p>
              </motion.div>
            )}

            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                {["Extracting case facts", "Researching policy", "Finding evidence", "Drafting letter"].map(
                  (label, i) => (
                    <LoadingRow key={label} label={label} delay={i * 0.22} />
                  )
                )}
              </motion.div>
            )}

            {(status === "done" || status === "error") && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease }}
                className="flex flex-col gap-6"
              >
                {status === "error" && (
                  <p className="font-sans text-[13px] text-[#a9453c]">
                    Error: {result.error}
                  </p>
                )}

                {result.case_data && (
                  <Card className="p-6">
                    <Eyebrow className="mb-4">Case facts</Eyebrow>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
                      {Object.entries(result.case_data).map(([k, v]) => (
                        <Fragment key={k} label={k.replace(/_/g, " ")} value={String(v ?? "—")} />
                      ))}
                    </dl>
                  </Card>
                )}

                {result.policy_finding && (
                  <Card className="p-6">
                    <Eyebrow className="mb-3">Policy finding</Eyebrow>
                    <p className="font-serif text-[1rem] leading-[1.6] text-ink">
                      {result.policy_finding}
                    </p>
                  </Card>
                )}

                {result.evidence_finding && (
                  <Card className="p-6">
                    <Eyebrow className="mb-3">Clinical evidence</Eyebrow>
                    <p className="font-serif text-[1rem] leading-[1.6] text-ink">
                      {result.evidence_finding}
                    </p>
                  </Card>
                )}

                {result.letter && (
                  <Card className="p-6">
                    <Eyebrow className="mb-3">Generated letter</Eyebrow>
                    <pre className="whitespace-pre-wrap font-sans text-[13px] leading-[1.75] text-ink">
                      {result.letter}
                    </pre>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── debug panel ── */}
      <AnimatePresence>
        {showDebug && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="mt-10 border-t border-rule pt-8">
              <div className="mb-4 flex items-center justify-between">
                <Eyebrow>Debug</Eyebrow>
                {debug && (
                  <span className="font-sans text-[11px] text-ink-faint">
                    {debug.elapsed}ms · HTTP {debug.status || "—"}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* request */}
                <div className="flex flex-col gap-2">
                  <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    Request
                  </p>
                  <pre className="overflow-auto rounded-none border border-rule bg-paper-deep p-4 font-mono text-[11px] leading-[1.7] text-ink-muted">
                    {JSON.stringify(
                      {
                        url: `${BACKEND}/v1/intake`,
                        method: "POST",
                        body: {
                          file: file?.name ?? null,
                          message: message || null,
                          voice: voice || null,
                        },
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>

                {/* response */}
                <div className="flex flex-col gap-2">
                  <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    Response
                  </p>
                  <pre className="overflow-auto rounded-none border border-rule bg-paper-deep p-4 font-mono text-[11px] leading-[1.7] text-ink-muted">
                    {debug
                      ? JSON.stringify(debug.raw, null, 2)
                      : "Run analysis to see the raw response."}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function Fragment({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink-faint">{label}</dt>
      <dd className="font-sans text-[13px] text-ink">{value}</dd>
    </>
  );
}

function LoadingRow({ label, delay }: { label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
      className="flex items-center gap-4 border-b border-rule py-4"
    >
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay }}
        className="h-1.5 w-1.5 rounded-full bg-ochre"
      />
      <span className="font-sans text-[12px] uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </span>
    </motion.div>
  );
}

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      className="inline-block h-3.5 w-3.5 rounded-full border border-paper border-t-transparent"
    />
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0L8 8m4-4 4 4M4 20h16"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink-faint"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="24" height="28" viewBox="0 0 24 28" fill="none" aria-hidden="true">
      <path
        d="M4 2h12l6 6v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1"
        className="text-ochre"
      />
      <path d="M16 2v7h6" stroke="currentColor" strokeWidth="1" className="text-ochre" />
    </svg>
  );
}
