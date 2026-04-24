"use client";

import { motion } from "framer-motion";
import { editorialEase, fadeUp, staggerParent } from "@/lib/motion";

type Props = {
  number: string;
  title: string;
  body: string;
  footnote?: string;
};

export function PanelText({ number, title, body, footnote }: Props) {
  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      className="max-w-[30rem]"
    >
      <motion.div
        variants={fadeUp}
        className="mb-10 flex items-center gap-4"
      >
        <span className="font-serif text-[3rem] leading-none tracking-tight text-ochre">
          {number}
        </span>
        <span
          aria-hidden="true"
          className="h-[1px] flex-1 bg-ink/15"
        />
      </motion.div>
      <motion.h3
        variants={fadeUp}
        className="font-serif text-display-sm font-normal leading-[1.04] tracking-tight text-ink"
      >
        {title}
      </motion.h3>
      <motion.p
        variants={fadeUp}
        className="mt-8 max-w-[28rem] font-sans text-[1.0625rem] leading-[1.6] text-ink-muted"
      >
        {body}
      </motion.p>
      {footnote && (
        <motion.p
          variants={fadeUp}
          className="mt-8 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint"
        >
          {footnote}
        </motion.p>
      )}
    </motion.div>
  );
}

// Wrapper that reserves 100vh of scroll for each panel's text.
export function PanelScroll({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "top" | "bottom";
}) {
  const justify =
    align === "top" ? "items-start pt-28" : align === "bottom" ? "items-end pb-28" : "items-center";
  return (
    <div className={`flex min-h-[100vh] ${justify}`}>
      <div className="w-full">{children}</div>
    </div>
  );
}
