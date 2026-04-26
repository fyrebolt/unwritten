"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { runAgents, type ClientCase, type RunAgentsResponse } from "@/lib/cases/client";

type Phase = "idle" | "running" | "done" | "error";

export function LiveAgentsClient({ seed }: { seed: ClientCase }) {
  const [phase, setPhase] = useState<Phase>(seed.appeal?.draftLetter ? "done" : "idle");
  const [result, setResult] = useState<RunAgentsResponse | null>(
    seed.appeal?.draftLetter
      ? {
          ok: true,
          case: seed,
          result: {
            letter: seed.appeal.draftLetter,
            policyFinding: seed.appeal.policyFinding ?? "",
            evidenceFinding: seed.appeal.evidenceFinding ?? "",
            caseFacts: (seed.appeal.caseFacts as Record<string, unknown>) ?? {},
          },
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setPhase("running");
    setError(null);
    try {
      const r = await runAgents(seed.id);
      setResult(r);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agents failed.");
      setPhase("error");
    }
  };

  const facts = seed.denialDocument?.extractedFacts;

  return (
    <div className="mx-auto max-w-[88rem] px-6 py-12 md:px-10 md:py-16 lg:px-14">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
        <div className="flex flex-col gap-2">
          <Eyebrow>Live agents · Real run</Eyebrow>
          <h1 className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.1] tracking-tight text-ink">
            {seed.title}
          </h1>
          <p className="max-w-[60ch] font-serif text-[1rem] leading-[1.55] text-ink-muted">
            This page actually calls the Python intake / policy / evidence / drafting
            agents against your uploaded denial. The cinematic workspace lives at{" "}
            <Link href={`/case/${seed.id}`} className="text-ochre underline-offset-4 hover:underline">
              /case/{seed.id.slice(0, 6)}…
            </Link>{" "}
            for the demo loop.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRun}
            disabled={phase === "running"}
          >
            {phase === "running"
              ? "Running agents…"
              : phase === "done"
                ? "Re-run agents"
                : "Run agents"}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/case/${seed.id}`}>Switch to simulation</Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr]">
        <section className="space-y-6">
          <div>
            <Eyebrow>Source denial</Eyebrow>
            <div className="mt-3 border border-rule bg-paper-deep/30 px-4 py-4">
              <p className="font-serif text-[1.05rem] text-ink">
                {seed.denialDocument?.fileName ?? "No file on record"}
              </p>
              {seed.denialDocument?.cloudinaryUrl && (
                <a
                  href={seed.denialDocument.cloudinaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-sans text-[11px] uppercase tracking-[0.2em] text-ochre underline-offset-4 hover:underline"
                >
                  Open Cloudinary asset →
                </a>
              )}
              {result?.pdfNote && (
                <p className="mt-3 font-sans text-[11px] text-[#a9453c]">{result.pdfNote}</p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-sans text-[12px]">
                <Fact label="Insurer" value={facts?.insurer} />
                <Fact label="Plan" value={facts?.planType} />
                <Fact label="Service" value={facts?.serviceDenied} />
                <Fact label="Reason" value={facts?.denialReasonText} />
                <Fact label="Member id" value={facts?.memberId} />
                <Fact label="Deadline" value={facts?.appealDeadline} />
              </dl>
            </div>
          </div>

          {seed.patientNarrative?.voiceTranscript && (
            <div>
              <Eyebrow>Patient voice</Eyebrow>
              <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap border border-rule bg-paper-deep/30 px-4 py-3 font-serif text-[0.95rem] leading-[1.55] text-ink-muted">
                {seed.patientNarrative.voiceTranscript}
              </p>
            </div>
          )}

          {result?.ok && (
            <div className="space-y-4">
              <FindingBlock label="Policy agent" body={result.result.policyFinding} />
              <FindingBlock label="Evidence agent" body={result.result.evidenceFinding} />
            </div>
          )}
          {error && (
            <p className="border border-red-800/30 bg-red-50/40 px-3 py-2 font-sans text-[12px] text-[#a9453c]">
              {error}
            </p>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <Eyebrow>Drafted appeal</Eyebrow>
            {phase === "running" && (
              <motion.span
                className="font-sans text-[11px] uppercase tracking-[0.22em] text-ochre"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                Writing…
              </motion.span>
            )}
          </div>
          <article className="mt-3 min-h-[420px] border border-rule bg-paper px-6 py-6 font-serif text-[0.97rem] leading-[1.65] text-ink whitespace-pre-wrap">
            {result?.ok && result.result.letter
              ? result.result.letter
              : phase === "idle"
                ? "Tap Run agents to call the live intake / policy / evidence / drafting pipeline against this case's denial PDF."
                : phase === "running"
                  ? "Calling agents service…"
                  : phase === "error"
                    ? "Run failed. See the error above."
                    : "No letter on record yet."}
          </article>
        </section>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">{label}</dt>
      <dd className="font-serif text-[14px] text-ink">{value?.trim() ? value : "—"}</dd>
    </>
  );
}

function FindingBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap border border-rule bg-paper-deep/40 px-4 py-3 font-serif text-[0.94rem] leading-[1.55] text-ink-muted">
        {body || "No finding returned."}
      </p>
    </div>
  );
}
