"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Animated audio waveform. If mic permission is granted, bars reflect live
 * audio levels. If denied or unsupported, bars fall back to a gentle idle
 * animation so the UI still feels alive.
 */
export function Waveform({
  bars = 24,
  active,
  className,
}: {
  bars?: number;
  active: boolean;
  className?: string;
}) {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: bars }, () => 0.22),
  );
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => undefined);
      streamRef.current = null;
      analyserRef.current = null;
      audioCtxRef.current = null;
      setLevels((prev) => prev.map(() => 0.22));
      return;
    }

    let cancelled = false;
    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AC();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        analyserRef.current = analyser;
        setMicOk(true);

        const buf = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(buf);
          const next: number[] = [];
          const step = Math.floor(buf.length / bars);
          for (let i = 0; i < bars; i++) {
            const raw = buf[i * step] ?? 0;
            next.push(Math.max(0.18, (raw / 255) * 1.3));
          }
          setLevels(next);
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        if (cancelled) return;
        setMicOk(false);
        // Fallback: synthetic gentle wave.
        let t = 0;
        const loop = () => {
          t += 0.06;
          const next: number[] = [];
          for (let i = 0; i < bars; i++) {
            const phase = t + i * 0.25;
            next.push(0.24 + Math.abs(Math.sin(phase)) * 0.62);
          }
          setLevels(next);
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      }
    }
    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => undefined);
    };
  }, [active, bars]);

  return (
    <div
      className={cn(
        "flex h-full items-center justify-center gap-[3px]",
        className,
      )}
      aria-hidden="true"
      data-mic-granted={micOk === true ? "yes" : micOk === false ? "no" : "pending"}
    >
      {levels.map((v, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full"
          style={{
            height: `${Math.min(100, v * 100)}%`,
            background: i % 7 === 0 ? "var(--ochre)" : "var(--ink)",
            opacity: 0.85,
            transition: "height 80ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      ))}
    </div>
  );
}
