"use client";

import { motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { PanelScroll, PanelText } from "./Panel";
import { VoiceMock } from "./VoiceMock";
import { DenialMock } from "./DenialMock";
import { LetterMock } from "./LetterMock";
import { editorialEase } from "@/lib/motion";

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Crossfade progress windows. Panel text-center midpoints (measured):
  //   Panel 1 ≈ 0.20, Panel 2 ≈ 0.60, Panel 3 ≈ 1.00.
  // Transitions land ~halfway between midpoints (0.40 and 0.80).
  const voiceOpacity = useTransform(
    scrollYProgress,
    [0, 0.34, 0.44],
    [1, 1, 0],
  );
  const voiceScale = useTransform(scrollYProgress, [0, 0.44], [1, 0.96]);

  const denialOpacity = useTransform(
    scrollYProgress,
    [0.36, 0.48, 0.74, 0.86],
    [0, 1, 1, 0],
  );
  const denialScale = useTransform(
    scrollYProgress,
    [0.36, 0.48, 0.74, 0.86],
    [0.96, 1, 1, 0.96],
  );

  const letterOpacity = useTransform(
    scrollYProgress,
    [0.76, 0.88, 1],
    [0, 1, 1],
  );
  const letterScale = useTransform(scrollYProgress, [0.76, 0.88], [0.96, 1]);

  return (
    <section
      id="how-it-works"
      ref={ref}
      aria-label="How it works"
      className="relative"
    >
      {/* Section eyebrow — sits just above, scrolls normally */}
      <div className="mx-auto max-w-[88rem] px-6 pt-40 md:px-12 md:pt-56 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, ease: editorialEase }}
          className="flex items-end justify-between border-b border-rule pb-8"
        >
          <div>
            <p className="mb-4 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-muted">
              How it works
            </p>
            <h2 className="max-w-[38rem] font-serif text-display-sm font-normal leading-[1.05] tracking-tight text-ink">
              Three minutes.{" "}
              <em className="italic text-ink-muted">No lawyers.</em>
            </h2>
          </div>
          <p className="hidden max-w-[18rem] font-sans text-[0.9375rem] leading-[1.55] text-ink-muted md:block">
            From the moment you tell us what happened to the moment a
            certified letter reaches your insurer&rsquo;s desk.
          </p>
        </motion.div>
      </div>

      <div className="mx-auto max-w-[88rem] px-6 md:px-12 lg:px-20">
        <div className="relative grid grid-cols-1 gap-x-12 md:grid-cols-2 md:gap-x-16 lg:gap-x-24">
          {/* LEFT — three text panels */}
          <div className="relative">
            <PanelScroll>
              <PanelText
                number="01"
                title="Speak, don't type."
                body="You&rsquo;ve already explained this five times to a call center. Tell us once — out loud — and we&rsquo;ll transcribe, structure, and understand. No forms. No clinical jargon you have to guess at."
                footnote="· Average intake time — 2 min 40 sec"
              />
            </PanelScroll>
            <PanelScroll>
              <PanelText
                number="02"
                title="Every word, annotated."
                body="We read the denial letter the way an attorney would. Clinical policy citations, missing prior authorizations, procedural missteps — each one becomes a lever we can pull in the appeal."
                footnote="· Parses 180+ insurer formats"
              />
            </PanelScroll>
            <PanelScroll>
              <PanelText
                number="03"
                title="Cited. Formatted. Sent."
                body="A formal appeal, written to the exact standard your plan requires, with every assertion backed by the right citation. We fax, email, or send certified mail — and we track every reply."
                footnote="· Median time to overturn — 11 days"
              />
            </PanelScroll>
          </div>

          {/* RIGHT — sticky mock container with three crossfaded mocks */}
          <div className="relative hidden md:block">
            <div className="sticky top-0 flex h-screen items-center">
              <div className="relative w-full">
                <motion.div
                  style={{ opacity: voiceOpacity, scale: voiceScale }}
                  className="absolute inset-0 flex items-center"
                >
                  <VoiceMock />
                </motion.div>
                <motion.div
                  style={{ opacity: denialOpacity, scale: denialScale }}
                  className="absolute inset-0 flex items-center"
                >
                  <DenialMock progress={scrollYProgress} />
                </motion.div>
                <motion.div
                  style={{ opacity: letterOpacity, scale: letterScale }}
                  className="absolute inset-0 flex items-center"
                >
                  <LetterMock />
                </motion.div>
                {/* Spacer to reserve layout height for absolute-positioned mocks */}
                <div className="invisible">
                  <VoiceMock />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — mobile stack (non-sticky, just below each text panel) */}
          <div className="space-y-24 pb-24 md:hidden">
            <VoiceMock />
            <DenialMockMobile />
            <LetterMock />
          </div>
        </div>
      </div>
    </section>
  );
}

// Mobile variant — no sticky scroll, so we park progress in the middle of
// panel 2 so all highlights are visible at rest.
function DenialMockMobile() {
  const staticProgress = useMotionValue(0.5);
  return <DenialMock progress={staticProgress} />;
}
