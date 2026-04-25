import { cn } from "@/lib/utils";
import type { CaseStatus } from "@/lib/mock/cases";

export function Pill({
  status,
  className,
}: {
  status: CaseStatus;
  className?: string;
}) {
  const tinted = status === "APPEAL APPROVED";
  const danger = status === "APPEAL DENIED";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.18em]",
        tinted && "border-ochre/40 bg-ochre/10 text-ochre",
        danger && "border-[#a9453c]/40 text-[#a9453c]",
        !tinted && !danger && "border-ink/20 text-ink-muted",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1 w-1 rounded-full",
          tinted && "bg-ochre",
          danger && "bg-[#a9453c]",
          !tinted && !danger && "bg-ink-muted",
        )}
      />
      {status}
    </span>
  );
}
