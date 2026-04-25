"use client";

import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

const base =
  "group relative inline-flex items-center justify-center gap-2 font-sans transition-colors duration-200 ease-editorial disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-ochre";

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[11px] uppercase tracking-[0.16em]",
  md: "h-10 px-4 text-[11px] uppercase tracking-[0.18em]",
  lg: "h-14 px-8 text-[13px] uppercase tracking-[0.18em]",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-ochre text-paper border border-ochre hover:bg-[#a27939] hover:border-[#a27939]",
  outline:
    "border border-ink/20 text-ink hover:border-ochre hover:text-ochre",
  ghost: "text-ink hover:text-ochre",
  link: "px-0 text-ink hover:text-ochre",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "outline", size = "md", asChild, ...props },
    ref,
  ) {
    const Cmp = asChild ? Slot : "button";
    return (
      <Cmp
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      />
    );
  },
);
