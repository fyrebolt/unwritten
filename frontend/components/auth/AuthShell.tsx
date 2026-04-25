"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const QUOTES = {
  signin: "Every denial has a counterargument.",
  signup: "The first draft is the hardest — we'll write it with you.",
} as const;

export function AuthShell({
  mode,
  children,
}: {
  mode: keyof typeof QUOTES;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-paper">
      <aside className="relative hidden w-[60%] flex-col justify-between border-r border-rule px-14 py-12 md:flex lg:px-20">
        <Link
          href="/"
          className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted transition-colors duration-200 ease-editorial hover:text-ochre"
        >
          Unwritten
        </Link>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[28ch] font-serif text-[clamp(2rem,3.5vw,3.25rem)] leading-[1.05] tracking-tight text-ink"
        >
          {QUOTES[mode]}
        </motion.p>
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-faint">
          A patient advocate, made of language.
        </p>
      </aside>
      <section className="flex w-full flex-1 items-center justify-center px-6 py-12 md:w-[40%] md:px-10">
        <div className="w-full max-w-[360px]">{children}</div>
      </section>
    </div>
  );
}
