"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-none border-0 border-b border-rule bg-transparent px-0 py-3 font-sans text-[15px] text-ink outline-none transition-[border-color,border-width] duration-200 ease-editorial placeholder:text-ink-faint focus:border-b-2 focus:border-ochre",
          className,
        )}
        {...props}
      />
    );
  },
);
