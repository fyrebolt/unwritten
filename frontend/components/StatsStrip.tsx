"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { CountUp } from "./ui/CountUp";
import { editorialEase, fadeUp, staggerParent } from "@/lib/motion";

type Stat = {
  prefix?: string;
  suffix?: string;
  value: number;
  decimals?: number;
  caption: string;
};

const stats: Stat[] = [
  {
    prefix: "$",
    value: 400,
    suffix: "B",
    caption: "denied by insurers last year alone.",
  },
  {
    value: 60,
    suffix: "%",
    caption: "of appeals filed actually win.",
  },
  {
    value: 0.1,
    decimals: 1,
    suffix: "%",
    caption: "of denied patients ever file one.",
  },
];

export function StatsStrip() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const bgShift = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section
      ref={ref}
      aria-label="Why this matters"
      className="relative overflow-hidden bg-paper-deep py-60 md:py-72"
    >
      {/* Subtle tinted gradient that drifts */}
      <motion.div
        aria-hidden="true"
        style={{ y: bgShift }}
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 60% at 50% 30%, rgba(182,135,74,0.08), transparent 60%)",
          }}
        />
      </motion.div>

      <div className="mx-auto max-w-[88rem] px-6 md:px-12 lg:px-20">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: editorialEase }}
          className="mb-20 text-center font-sans text-eyebrow uppercase tracking-eyebrow text-ink-muted"
        >
          The math
        </motion.p>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 divide-y divide-rule md:grid-cols-3 md:divide-x md:divide-y-0"
        >
          {stats.map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="flex flex-col items-center px-6 py-16 text-center md:px-8 md:py-0"
            >
              <span className="block font-serif text-[clamp(3rem,6.5vw,6.5rem)] font-normal leading-none tracking-tight text-ink">
                <CountUp
                  to={s.value}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals ?? 0}
                  ariaLabel={`${s.prefix ?? ""}${s.value}${s.suffix ?? ""}`}
                />
              </span>
              <span
                aria-hidden="true"
                className="mt-8 block h-[1px] w-16 bg-ochre"
              />
              <p className="mt-6 max-w-xs font-sans text-base leading-[1.55] text-ink-muted md:text-[1.0625rem]">
                {s.caption}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: editorialEase, delay: 0.2 }}
          className="mx-auto mt-28 max-w-prose text-center font-serif text-[clamp(1.5rem,2.6vw,2.25rem)] italic leading-[1.35] text-ink"
        >
          That last number is the one we&rsquo;re here to change.
        </motion.p>
      </div>
    </section>
  );
}
