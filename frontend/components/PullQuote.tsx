"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { editorialEase } from "@/lib/motion";

/**
 * Optional landing testimonial block — not used on the current home page
 * (replaced by the Agents section) but kept so marketing routes or A/B
 * tests can re-enable it without resurrecting the file.
 */
export function PullQuote() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Quote slides up slightly faster than the surrounding background.
  const quoteY = useTransform(scrollYProgress, [0, 1], ["20%", "-14%"]);
  const markY = useTransform(scrollYProgress, [0, 1], ["8%", "-6%"]);

  return (
    <section
      ref={ref}
      aria-label="A testimonial"
      className="relative overflow-hidden py-48 md:py-64"
    >
      {/* Giant editorial quotation mark as a watermark */}
      <motion.span
        aria-hidden="true"
        style={{ y: markY }}
        className="pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2 font-serif text-[28rem] leading-[0.6] text-ochre/10 md:text-[36rem]"
      >
        &ldquo;
      </motion.span>

      <motion.figure
        style={{ y: quoteY }}
        className="relative mx-auto max-w-[62rem] px-6 text-center md:px-12"
      >
        <motion.blockquote
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1, ease: editorialEase }}
          className="font-serif text-[clamp(1.75rem,4.2vw,3rem)] font-normal italic leading-[1.3] tracking-[-0.01em] text-ink"
        >
          I had been fighting Aetna for eleven months. Unwritten wrote a
          letter in four minutes that overturned the denial in nine days.
        </motion.blockquote>
        <motion.figcaption
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: editorialEase, delay: 0.3 }}
          className="mt-10 inline-flex items-center gap-3 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-muted"
        >
          <span
            aria-hidden="true"
            className="block h-[1px] w-10 bg-ink/25"
          />
          Filler testimonial — replace later
        </motion.figcaption>
      </motion.figure>
    </section>
  );
}
