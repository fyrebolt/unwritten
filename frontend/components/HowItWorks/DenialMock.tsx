"use client";

import { motion, type MotionValue, useTransform } from "framer-motion";
import { editorialEase } from "@/lib/motion";

type Props = {
  /** Progress within the HowItWorks section (0..1). Panel 2 lives in [0.33, 0.66]. */
  progress: MotionValue<number>;
};

/**
 * The showcase. A believable insurance denial letter, with three phrases
 * that get highlighted in sequence + floating callouts with hairline
 * leader lines. Drives entirely from scroll progress inside HowItWorks.
 */
export function DenialMock({ progress }: Props) {
  // Highlight reveals — timed inside Panel 2's plateau [0.48, 0.74].
  const h1 = useTransform(progress, [0.50, 0.56], [0, 1]);
  const h2 = useTransform(progress, [0.58, 0.64], [0, 1]);
  const h3 = useTransform(progress, [0.66, 0.72], [0, 1]);

  return (
    <div className="relative w-full">
      {/* Paper */}
      <div className="relative overflow-hidden rounded-sm border border-rule bg-[#FBF8F1] px-9 pb-10 pt-8 shadow-[0_30px_60px_-30px_rgba(28,22,12,0.22)]">
        {/* Letterhead */}
        <div className="mb-6 flex items-start justify-between border-b border-rule pb-5">
          <div>
            <p className="font-serif text-[1.5rem] leading-none tracking-tight text-ink">
              Aetna<span className="text-ochre">.</span>
            </p>
            <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Claims Review Department
            </p>
          </div>
          <div className="text-right font-sans text-[10px] tracking-[0.12em] text-ink-muted">
            <p>CASE · 847-221-B</p>
            <p>DATE · 03.07.2026</p>
            <p>PAGE · 1 / 2</p>
          </div>
        </div>

        {/* Decision banner */}
        <p className="mb-5 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-ink">
          Decision: Denial of coverage
        </p>

        {/* Body */}
        <div className="space-y-4 font-serif text-[0.9375rem] leading-[1.65] text-ink/90">
          <p>
            Dear Member, we have completed review of the claim referenced
            above. After a review of your medical records and our clinical
            policy guidelines, we have determined that{" "}
            <Highlight progress={h1} color="rgba(182,135,74,0.28)">
              the requested service is not medically necessary
            </Highlight>{" "}
            under the terms of your plan.
          </p>
          <p>
            Our determination further notes that{" "}
            <Highlight progress={h2} color="rgba(182,135,74,0.28)">
              prior authorization was not obtained
            </Highlight>{" "}
            in advance of the scheduled procedure as required by your
            plan&rsquo;s utilization management guidelines.
          </p>
          <p>
            Please note that you have the right to request an internal
            appeal within thirty (30) calendar days of the date of this
            notice. Additionally, you may be eligible to request an
            external, independent review.{" "}
            <Highlight progress={h3} color="rgba(182,135,74,0.28)">
              A written appeal must include clinical justification
            </Highlight>{" "}
            and any supporting documentation from your treating provider.
          </p>
          <p className="text-ink-muted">
            If you have questions, please contact Member Services at the
            number on your ID card. We appreciate your understanding.
          </p>
        </div>

        {/* Sign-off */}
        <div className="mt-6 border-t border-rule pt-4 font-sans text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Sincerely — Claims Review Dept. / ref. 847-221-B
        </div>
      </div>

      {/* Callout cards with leader lines */}
      <Callout
        progress={h1}
        positionClass="right-[-14%] top-[18%] w-[220px]"
        leader="M 6 14 L -80 48"
        title="Administrative."
        body="Not a medical denial. This is a paperwork error — and it&rsquo;s contestable."
      />
      <Callout
        progress={h2}
        positionClass="left-[-14%] top-[48%] w-[200px]"
        leader="M 214 20 L 300 52"
        leaderOrigin="right"
        title="Prior auth."
        body="The insurer must prove it was required. They rarely have the records."
      />
      <Callout
        progress={h3}
        positionClass="right-[-14%] bottom-[14%] w-[220px]"
        leader="M 6 12 L -80 -20"
        title="30 days."
        body="Under ERISA, you have a clear window. We file on day one."
      />
    </div>
  );
}

function Highlight({
  children,
  progress,
  color,
}: {
  children: React.ReactNode;
  progress: MotionValue<number>;
  color: string;
}) {
  const scaleX = useTransform(progress, (v) => v);
  return (
    <span className="relative inline">
      <motion.span
        aria-hidden="true"
        style={{ scaleX, background: color, originX: 0 }}
        className="absolute inset-x-0 inset-y-[-2px] -z-10 block origin-left"
      />
      <span className="relative">{children}</span>
    </span>
  );
}

function Callout({
  progress,
  positionClass,
  leader,
  leaderOrigin = "left",
  title,
  body,
}: {
  progress: MotionValue<number>;
  positionClass: string;
  leader: string;
  leaderOrigin?: "left" | "right";
  title: string;
  body: string;
}) {
  const opacity = useTransform(progress, [0, 1], [0, 1]);
  const y = useTransform(progress, [0, 1], [12, 0]);
  return (
    <motion.aside
      style={{ opacity, y }}
      className={`pointer-events-none absolute hidden md:block ${positionClass}`}
      aria-hidden="true"
    >
      <div className="relative">
        {/* Leader line — very thin, ochre */}
        <svg
          className={`absolute ${leaderOrigin === "left" ? "-left-24 top-4" : "-right-24 top-4"} h-[60px] w-[100px] overflow-visible`}
          viewBox="0 0 220 60"
          fill="none"
        >
          <motion.path
            d={leader}
            stroke="var(--ochre)"
            strokeWidth="0.8"
            pathLength={1}
            style={{ pathLength: opacity }}
          />
          <motion.circle
            cx={leaderOrigin === "left" ? "6" : "214"}
            cy={leader.includes("-20") ? "12" : leader.includes("52") ? "20" : "14"}
            r="2"
            fill="var(--ochre)"
            style={{ opacity }}
          />
        </svg>
        <div className="rounded-sm border border-ochre/40 bg-paper px-4 py-3 shadow-[0_20px_40px_-24px_rgba(28,22,12,0.22)]">
          <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ochre">
            {title}
          </p>
          <p className="mt-1 font-serif text-[0.9375rem] leading-[1.4] text-ink">
            {body}
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
