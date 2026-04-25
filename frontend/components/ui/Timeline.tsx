"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/mock/timeline";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative" role="list">
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-[7px] top-3 w-px bg-rule"
      />
      {events.map((e, i) => (
        <TimelineNode key={e.id} event={e} index={i} />
      ))}
    </ol>
  );
}

function TimelineNode({ event, index }: { event: TimelineEvent; index: number }) {
  const [open, setOpen] = useState(false);
  const isCurrent = event.state === "complete" && index === 0;
  return (
    <li className="relative pl-8 py-6" aria-label={event.title}>
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-7 flex h-[15px] w-[15px] items-center justify-center rounded-full border",
          event.state === "complete" && "border-ochre bg-ochre",
          event.state === "pending" && "border-rule bg-paper",
          event.state === "past" && "border-ink-muted/30 bg-paper",
        )}
      >
        {isCurrent && (
          <motion.span
            className="absolute inset-0 rounded-full border border-ochre"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </span>
      <button
        onClick={() => setOpen((o) => !o)}
        className="group block w-full text-left focus-visible:outline-ochre"
        aria-expanded={open}
      >
        <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {event.at}
        </p>
        <h3 className="mt-1 font-serif text-[1.35rem] leading-[1.2] tracking-tight text-ink group-hover:underline decoration-ochre underline-offset-4">
          {event.title}
        </h3>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        {event.details && (
          <p className="mt-3 max-w-prose font-serif text-[0.95rem] leading-[1.65] text-ink-muted">
            {event.details}
          </p>
        )}
      </motion.div>
    </li>
  );
}
