"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { LetterSVG } from "./LetterSVG";
import { editorialEase, fadeUp, staggerParent } from "@/lib/motion";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Three parallax speeds.
  const layerA = useTransform(scrollYProgress, [0, 1], ["0%", "42%"]); // 0.3x-ish (slow)
  const layerARot = useTransform(scrollYProgress, [0, 1], [0, 4]);
  const layerAOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.9, 0.25]);
  const layerB = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]); // 1x
  const layerC = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]); // 1.4x (fast)
  const heroFade = useTransform(scrollYProgress, [0.5, 1], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative isolate min-h-[112vh] w-full overflow-hidden"
      aria-label="Hero"
    >
      {/* Layer A — letter, slow */}
      <motion.div
        className="pointer-events-none absolute right-[-8%] top-[6%] z-[2] w-[62vw] max-w-[780px] md:right-[-4%] md:top-[4%]"
        style={{ y: layerA, rotate: layerARot, opacity: layerAOpacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 3 }}
          transition={{ duration: 1.4, ease: editorialEase, delay: 0.2 }}
          className="origin-center"
        >
          <LetterSVG className="h-auto w-full drop-shadow-[0_40px_60px_rgba(28,22,12,0.14)]" />
        </motion.div>
      </motion.div>

      {/* Soft radial warmth behind layer A */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10%] top-[8%] -z-10 h-[90vh] w-[80vw] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(182,135,74,0.14), rgba(182,135,74,0))",
        }}
      />

      {/* Layer B — headline block, normal speed */}
      <motion.div
        style={{ y: layerB, opacity: heroFade }}
        className="relative z-10 mx-auto flex min-h-[100vh] w-full max-w-[120rem] flex-col justify-center px-6 pb-24 pt-40 md:px-12 md:pt-48 lg:px-20"
      >
        <motion.div
          variants={staggerParent}
          initial="hidden"
          animate="show"
          className="max-w-[min(72ch,68vw)]"
        >
          {/* Layer C — eyebrow, fastest */}
          <motion.div style={{ y: layerC }}>
            <motion.p
              variants={fadeUp}
              className="mb-8 inline-flex items-center gap-3 text-eyebrow font-sans uppercase tracking-eyebrow text-ink-muted"
            >
              <span
                aria-hidden="true"
                className="inline-block h-[1px] w-10 bg-ink/30"
              />
              An AI advocate for the patient
            </motion.p>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-serif text-display font-normal leading-[1.02] tracking-tight text-ink"
          >
            <span className="block">The letter</span>
            <span className="block">
              that wasn&rsquo;t going to be{" "}
              <em className="italic text-ochre">written.</em>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-8 max-w-reading font-sans text-[1.125rem] leading-[1.6] text-ink-muted md:text-[1.25rem]"
          >
            Insurance companies deny one in five claims. Sixty percent of
            appeals actually win — but almost no one files them. Unwritten
            does, in three minutes, for free.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <CTA href="#intake">Begin your appeal</CTA>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-2 font-sans text-sm text-ink-muted transition-colors duration-200 ease-editorial hover:text-ink"
            >
              <span className="relative">
                See how it works
                <span
                  aria-hidden="true"
                  className="absolute bottom-[-3px] left-0 h-px w-full origin-left scale-x-100 bg-ink/30 transition-transform duration-300 ease-editorial group-hover:scale-x-100"
                />
              </span>
              <span
                aria-hidden="true"
                className="transition-transform duration-300 ease-editorial group-hover:translate-y-[2px]"
              >
                ↓
              </span>
            </a>
          </motion.div>

          {/* Layer C — metadata, fastest */}
          <motion.div
            style={{ y: layerC }}
            className="mt-24 flex flex-wrap items-center gap-x-10 gap-y-3"
          >
            <motion.p
              variants={fadeUp}
              className="font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint"
            >
              Est. 2026 — Los Angeles
            </motion.p>
            <span
              aria-hidden="true"
              className="hidden h-[1px] w-10 bg-ink/20 sm:block"
            />
            <motion.p
              variants={fadeUp}
              className="font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint"
            >
              For those denied
            </motion.p>
            <span
              aria-hidden="true"
              className="hidden h-[1px] w-10 bg-ink/20 sm:block"
            />
            <motion.p
              variants={fadeUp}
              className="font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint"
            >
              Made at LA Hacks
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Scroll cue — bottom-left */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.8, ease: editorialEase }}
          className="absolute bottom-10 left-6 hidden items-center gap-3 md:left-12 md:flex lg:left-20"
          aria-hidden="true"
        >
          <span className="h-[1px] w-10 origin-left animate-[ink-pulse_1.6s_ease-in-out_infinite] bg-ink/35" />
          <span className="font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint">
            Scroll
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}

function CTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group relative inline-flex items-center gap-3 overflow-hidden border border-ochre px-7 py-4 font-sans text-sm tracking-wide text-ink transition-colors duration-300 ease-editorial hover:text-paper"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 origin-bottom scale-y-0 bg-ochre transition-transform duration-500 ease-editorial group-hover:scale-y-100"
      />
      <span className="relative z-10 uppercase tracking-eyebrow">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="relative z-10 transition-transform duration-500 ease-editorial group-hover:translate-x-1"
      >
        →
      </span>
    </a>
  );
}
