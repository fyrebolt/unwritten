"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, interactive, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative border border-rule bg-paper/60 backdrop-blur-[1px] transition-[transform,box-shadow,border-color] duration-300 ease-editorial",
        interactive &&
          "hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_24px_48px_-32px_rgba(28,22,12,0.2)]",
        className,
      )}
      {...props}
    />
  );
});
