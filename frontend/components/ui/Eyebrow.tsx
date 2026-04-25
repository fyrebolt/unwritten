import { cn } from "@/lib/utils";

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted",
        className,
      )}
    >
      {children}
    </p>
  );
}
