"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Typewriter effect tuned to the editorial look. Types at a steady rate.
 * Supports sentence-end hooks so a caller can fade in citation markers
 * when each sentence finishes.
 */
export function TypingText({
  text,
  start = true,
  speed = 40, // chars per second
  onSentenceEnd,
  onComplete,
  showCaret = true,
  className,
}: {
  text: string;
  start?: boolean;
  speed?: number;
  onSentenceEnd?: (sentenceIndex: number) => void;
  onComplete?: () => void;
  showCaret?: boolean;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const firedRef = useRef(-1);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!start) return;
    if (count >= text.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }
    const interval = 1000 / speed;
    const id = window.setTimeout(() => setCount((c) => c + 1), interval);
    return () => window.clearTimeout(id);
  }, [start, count, text.length, speed, onComplete]);

  useEffect(() => {
    if (!onSentenceEnd) return;
    let idx = 0;
    for (let i = 0; i < count; i++) {
      if (/[.!?]/.test(text[i]) && text[i + 1] === " ") {
        if (idx > firedRef.current) {
          firedRef.current = idx;
          onSentenceEnd(idx);
        }
        idx++;
      }
    }
  }, [count, text, onSentenceEnd]);

  const typed = text.slice(0, count);
  return (
    <span className={className}>
      {typed}
      {showCaret && count < text.length && <span className="caret" />}
    </span>
  );
}
