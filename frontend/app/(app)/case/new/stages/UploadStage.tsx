"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/Eyebrow";

type Phase = "idle" | "reading" | "extracting" | "done";

export function UploadStage({ onExtracted }: { onExtracted: (name: string) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const runExtraction = useCallback(
    (name: string) => {
      setFileName(name);
      setPhase("reading");
      setProgress(0);
      let p = 0;
      const t = window.setInterval(() => {
        p += 6 + Math.random() * 8;
        if (p >= 100) {
          p = 100;
          setProgress(p);
          window.clearInterval(t);
          setPhase("extracting");
          window.setTimeout(() => {
            setPhase("done");
            window.setTimeout(() => onExtracted(name), 700);
          }, 1100);
        } else {
          setProgress(p);
        }
      }, 140);
    },
    [onExtracted],
  );

  const onDrop = useCallback(
    (files: File[]) => {
      const f = files[0];
      if (f) runExtraction(f.name);
    },
    [runExtraction],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxFiles: 1,
    disabled: phase !== "idle",
  });

  const useSample = () => runExtraction("anthem-denial-march-2026.pdf");

  return (
    <div className="grid grid-cols-1 gap-14 md:grid-cols-[1fr_0.8fr] md:gap-20">
      <div className="flex flex-col gap-4">
        <Eyebrow>Step 01</Eyebrow>
        <h1 className="max-w-[22ch] font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-tight text-ink">
          Start with the denial letter.
        </h1>
        <p className="max-w-[44ch] font-serif text-[1.05rem] leading-[1.6] text-ink-muted">
          Drop the PDF, photo, or scan. We'll read it, note the insurer, plan
          type, member ID, service denied, and the reason given.
        </p>
        <button
          type="button"
          onClick={useSample}
          disabled={phase !== "idle"}
          className="mt-4 self-start font-sans text-[11px] uppercase tracking-[0.22em] text-ochre transition-colors duration-200 ease-editorial hover:text-ink disabled:opacity-40"
        >
          — or use a sample denial
        </button>
      </div>

      <div>
        <div
          {...getRootProps()}
          className={cn(
            "relative flex aspect-[5/4] w-full cursor-pointer flex-col items-center justify-center gap-4 border border-dashed border-rule bg-paper-deep/40 px-8 text-center transition-colors duration-200 ease-editorial",
            isDragActive && "border-ochre bg-ochre/5",
            phase !== "idle" && "cursor-default",
          )}
          aria-label="Upload denial letter"
        >
          <input {...getInputProps()} />
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <DocIcon />
                <p className="font-serif text-[1.1rem] leading-[1.3] text-ink">
                  Drop the denial letter here.
                </p>
                <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
                  PDF · PNG · JPG
                </p>
              </motion.div>
            )}
            {phase !== "idle" && (
              <motion.div
                key="busy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex w-full flex-col items-center gap-5"
              >
                <DocIcon active />
                <p className="font-serif text-[1.05rem] leading-[1.3] text-ink">
                  {fileName}
                </p>
                <div className="h-px w-full max-w-[260px] bg-rule">
                  <motion.span
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: "block" }}
                    className="h-px bg-ochre"
                  />
                </div>
                <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                  {phase === "reading" && `Reading · ${Math.floor(progress)}%`}
                  {phase === "extracting" && "Extracting facts…"}
                  {phase === "done" && "Done."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function DocIcon({ active }: { active?: boolean }) {
  return (
    <motion.svg
      width="40"
      height="48"
      viewBox="0 0 40 48"
      fill="none"
      aria-hidden="true"
      initial={false}
      animate={{ y: active ? [-1, 0, -1] : 0 }}
      transition={{ duration: 2.2, repeat: active ? Infinity : 0, ease: "easeInOut" }}
    >
      <path
        d="M6 2h20l12 12v30a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1"
        className="text-ink-muted"
      />
      <path
        d="M26 2v12h12"
        stroke="currentColor"
        strokeWidth="1"
        className="text-ink-muted"
      />
      <path
        d="M10 24h20M10 30h20M10 36h12"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        className={active ? "text-ochre" : "text-ink-faint"}
      />
    </motion.svg>
  );
}
