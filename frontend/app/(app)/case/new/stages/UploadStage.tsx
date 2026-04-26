"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { isClientUploadConfigured } from "@/lib/cloudinary/config";
import { uploadUnsignedWithProgress } from "@/lib/cloudinary/upload-client";
import type { DenialAsset } from "@/lib/cloudinary/types";
import type { IntakeUploadPayload } from "@/lib/intake/types";
import { parseDenialFromUpload } from "@/lib/intake/parse-denial";
import { SAMPLE_DENIAL_EXTRACTED } from "@/lib/intake/sample-extraction";

type Phase = "idle" | "uploading" | "extracting" | "done" | "error";

export function UploadStage({
  onExtracted,
}: {
  onExtracted: (payload: IntakeUploadPayload) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cloudinaryReady = isClientUploadConfigured();

  const runPipeline = useCallback(
    async (file: File, asset?: DenialAsset) => {
      setFileName(file.name);
      setPhase("extracting");
      setProgress(0);
      const tick = window.setInterval(() => {
        setProgress((p) => (p >= 92 ? 92 : p + 4));
      }, 160);
      try {
        const { extracted, parseNote } = await parseDenialFromUpload({ file, asset });
        window.clearInterval(tick);
        setProgress(100);
        setPhase("done");
        window.setTimeout(() => {
          onExtracted({ fileName: file.name, asset, extracted, parseNote });
        }, 400);
      } catch (e) {
        window.clearInterval(tick);
        setPhase("error");
        setErrorMessage(e instanceof Error ? e.message : "Could not read this denial.");
      }
    },
    [onExtracted],
  );

  const processFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      setFileName(file.name);

      try {
        if (cloudinaryReady) {
          setPhase("uploading");
          setProgress(0);
          const asset = await uploadUnsignedWithProgress(file, setProgress);
          await runPipeline(file, asset);
        } else {
          await runPipeline(file);
        }
      } catch (e) {
        setPhase("error");
        setErrorMessage(e instanceof Error ? e.message : "Upload failed.");
      }
    },
    [cloudinaryReady, runPipeline],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const rejected = fileRejections[0];
      const f =
        acceptedFiles[0] ??
        (rejected && /\.(pdf|png|jpe?g)$/i.test(rejected.file.name) ? rejected.file : undefined);
      if (!f) {
        if (rejected) {
          setErrorMessage("Only PDF or PNG/JPEG images are supported.");
          setPhase("error");
        }
        return;
      }
      void processFile(f);
    },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxFiles: 1,
    disabled: phase !== "idle" && phase !== "error",
  });

  const useSample = () => {
    setErrorMessage(null);
    setFileName("anthem-denial-march-2026.pdf");
    setPhase("extracting");
    setProgress(0);
    const tick = window.setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 8));
    }, 120);
    window.setTimeout(() => {
      window.clearInterval(tick);
      setProgress(100);
      setPhase("done");
      window.setTimeout(() => {
        onExtracted({
          fileName: "anthem-denial-march-2026.pdf",
          extracted: SAMPLE_DENIAL_EXTRACTED,
        });
      }, 400);
    }, 900);
  };

  const statusLabel =
    phase === "uploading"
      ? `Uploading to Cloudinary · ${Math.floor(progress)}%`
      : phase === "extracting"
        ? `Parsing denial · ${Math.floor(progress)}%`
        : phase === "done"
          ? "Done."
          : "";

  const busy = phase !== "idle" && phase !== "error";

  return (
    <div className="grid grid-cols-1 gap-14 md:grid-cols-[1fr_0.8fr] md:gap-20">
      <div className="flex flex-col gap-4">
        <Eyebrow>Step 01</Eyebrow>
        <h1 className="max-w-[22ch] font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-tight text-ink">
          Start with the denial letter.
        </h1>
        <p className="max-w-[44ch] font-serif text-[1.05rem] leading-[1.6] text-ink-muted">
          PDFs upload to Cloudinary, then our API reads the text and fills insurer, member ID,
          service denied, and deadlines. Images use vision when{" "}
          <code className="text-[11px] text-ink">OPENAI_API_KEY</code> is set on the API.
        </p>
        {!cloudinaryReady && (
          <p className="max-w-[50ch] font-sans text-[12px] leading-relaxed text-ink-muted">
            Cloudinary is optional: without{" "}
            <code className="text-[11px] text-ink">NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code>{" "}
            we still parse the file locally via the API.
          </p>
        )}
        <p className="max-w-[50ch] font-sans text-[11px] leading-relaxed text-ink-faint">
          Cloudinary hackathon:{" "}
          <a
            href="https://cloudinary.com/pages/hackathons/"
            className="text-ochre underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            cloudinary.com/pages/hackathons
          </a>
          — media delivery + this intake pipeline.
        </p>
        <button
          type="button"
          onClick={useSample}
          disabled={busy}
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
            busy && "cursor-default",
            phase === "error" && "border-red-800/40",
          )}
          aria-label="Upload denial letter"
        >
          <input {...getInputProps()} />
          <AnimatePresence mode="wait">
            {(phase === "idle" || phase === "error") && (
              <motion.div
                key={phase === "error" ? "err" : "idle"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <DocIcon />
                {phase === "error" && errorMessage ? (
                  <>
                    <p className="max-w-[32ch] font-serif text-[1rem] leading-[1.35] text-ink">
                      {errorMessage}
                    </p>
                    <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
                      Tap to try again
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-serif text-[1.1rem] leading-[1.3] text-ink">
                      Drop the denial letter here.
                    </p>
                    <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
                      PDF · PNG · JPG
                    </p>
                  </>
                )}
              </motion.div>
            )}
            {busy && (
              <motion.div
                key="busy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex w-full flex-col items-center gap-5"
              >
                <DocIcon active />
                <p className="font-serif text-[1.05rem] leading-[1.3] text-ink">{fileName}</p>
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
                  {statusLabel}
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
