"use client";

import { motion } from "framer-motion";
import { editorialEase, fadeUp, staggerParent } from "@/lib/motion";

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-label="What it costs"
      className="relative overflow-hidden bg-paper-deep py-48 md:py-64"
    >
      <div className="mx-auto flex max-w-[88rem] flex-col items-center px-6 md:px-12 lg:px-20">
        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="relative mx-auto flex w-full max-w-[30rem] flex-col items-center text-center"
        >
          <motion.p
            variants={fadeUp}
            className="mb-10 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-muted"
          >
            Pricing
          </motion.p>

          <motion.h3
            variants={fadeUp}
            className="font-serif text-[clamp(6rem,14vw,11rem)] font-normal leading-[0.95] tracking-tight text-ink"
          >
            Free<span className="text-ochre">.</span>
          </motion.h3>

          <motion.span
            variants={fadeUp}
            aria-hidden="true"
            className="my-10 block h-[1px] w-24 bg-ochre"
          />

          <motion.p
            variants={fadeUp}
            className="max-w-prose font-serif text-[1.25rem] leading-[1.55] text-ink"
          >
            We don&rsquo;t take a cut of your win. We don&rsquo;t sell your
            data. We&rsquo;re funded by people who believe insurance should
            work for patients, not against them.
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="mt-10 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint"
          >
            *filler — replace with real model later
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
