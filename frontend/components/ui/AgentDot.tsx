import { cn } from "@/lib/utils";
import { agentDotColors, type AgentKind } from "@/lib/mock/agents";

export function AgentDot({
  agent,
  pulse = false,
  className,
}: {
  agent: AgentKind;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block h-1.5 w-1.5 rounded-full", className)}
      style={{ background: agentDotColors[agent] }}
    >
      {pulse && (
        <span
          className="absolute inset-0 rounded-full animate-ink-pulse"
          style={{
            background: agentDotColors[agent],
            opacity: 0.4,
            transform: "scale(1.8)",
          }}
        />
      )}
    </span>
  );
}
