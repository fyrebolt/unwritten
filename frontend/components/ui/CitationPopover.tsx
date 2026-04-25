"use client";

import * as Popover from "@radix-ui/react-popover";
import { policyChunks, type PolicyChunk } from "@/lib/mock/policies";

export function CitationPopover({
  citationId,
  index,
}: {
  citationId: string;
  index: number;
}) {
  const chunk: PolicyChunk | undefined = policyChunks[citationId];
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative -top-[0.4em] ml-[1px] cursor-pointer font-sans text-[0.7em] text-ochre transition-colors duration-200 ease-editorial hover:underline focus-visible:outline-ochre"
          aria-label={`Citation ${index}${chunk ? `: ${chunk.title}` : ""}`}
        >
          {index}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={6}
          className="z-50 w-[360px] border border-rule bg-paper p-4 text-left shadow-[0_30px_60px_-30px_rgba(28,22,12,0.25)] focus:outline-none"
        >
          {chunk ? (
            <>
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-ochre">
                {chunk.section}
              </p>
              <p className="mt-2 font-serif text-[0.95rem] leading-[1.45] text-ink">
                &ldquo;{chunk.quote}&rdquo;
              </p>
              <p className="mt-3 font-sans text-[11px] text-ink-muted">
                {chunk.source} · p. {chunk.page}
              </p>
            </>
          ) : (
            <p className="font-sans text-[12px] text-ink-muted">
              Citation unavailable.
            </p>
          )}
          <Popover.Arrow className="fill-paper stroke-rule" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
