"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  sizeVariant?: "md" | "lg";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, sizeVariant = "md", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "peer w-full border-0 border-b border-rule bg-transparent px-0 font-sans text-ink outline-none transition-[border-color,border-width] duration-200 ease-editorial focus:border-b-2 focus:border-ochre",
        "placeholder:text-ink-faint",
        sizeVariant === "lg" ? "py-3 text-[18px]" : "py-2 text-[15px]",
        className,
      )}
      {...props}
    />
  );
});
