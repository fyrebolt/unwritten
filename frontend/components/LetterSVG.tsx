"use client";

import { motion } from "framer-motion";
import { editorialEase } from "@/lib/motion";

/**
 * A believable letter. Paper, fold lines, a date block, a salutation,
 * handwritten body as subtle wavy strokes, a single ochre highlight, and
 * a signature loop. Everything is vector — scales to any size without loss.
 */
export function LetterSVG({ className }: { className?: string }) {
  const lines = [
    { y: 300, d: 520 },
    { y: 332, d: 500 },
    { y: 364, d: 540 },
    { y: 396, d: 460 },
    { y: 428, d: 510 },
    { y: 460, d: 480 },
    // after fold
    { y: 540, d: 520 },
    { y: 572, d: 480 },
    { y: 604, d: 510 },
    { y: 636, d: 420 },
  ];

  return (
    <svg
      viewBox="0 0 600 820"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="A handwritten appeal letter on warm off-white paper."
    >
      <defs>
        <filter id="letter-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.2"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            values="0 0 0 0 0.10
                    0 0 0 0 0.10
                    0 0 0 0 0.09
                    0 0 0 0.18 0"
          />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="letter-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="18" />
          <feColorMatrix
            values="0 0 0 0 0.20
                    0 0 0 0 0.18
                    0 0 0 0 0.14
                    0 0 0 0.22 0"
          />
        </filter>
        <linearGradient id="paper-warm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBF8F1" />
          <stop offset="100%" stopColor="#EFE9D8" />
        </linearGradient>
      </defs>

      {/* Drop shadow */}
      <rect
        x="36"
        y="48"
        width="528"
        height="724"
        rx="2"
        fill="#000"
        filter="url(#letter-shadow)"
        opacity="0.4"
      />

      {/* Paper */}
      <rect
        x="36"
        y="48"
        width="528"
        height="724"
        rx="2"
        fill="url(#paper-warm)"
        stroke="#D4CFBF"
        strokeWidth="0.6"
      />

      {/* Paper noise */}
      <rect
        x="36"
        y="48"
        width="528"
        height="724"
        rx="2"
        filter="url(#letter-grain)"
        opacity="0.85"
      />

      {/* Horizontal fold */}
      <line
        x1="36"
        y1="410"
        x2="564"
        y2="410"
        stroke="#C8C0A8"
        strokeWidth="0.5"
        strokeDasharray="1 3"
      />

      {/* Case / date block (top-right) */}
      <g fontFamily="Georgia, serif" fill="#6B665C">
        <text x="432" y="100" fontSize="11" letterSpacing="1.2">
          CASE · 2026-03-14
        </text>
        <text x="432" y="118" fontSize="11" letterSpacing="1.2">
          LOS ANGELES, CA
        </text>
      </g>

      {/* Salutation (serif, crisp) */}
      <text
        x="74"
        y="178"
        fontFamily="Georgia, serif"
        fontSize="20"
        fill="#1A1A17"
      >
        To whom it may concern,
      </text>
      <text
        x="74"
        y="226"
        fontFamily="Georgia, serif"
        fontSize="14"
        fill="#6B665C"
        fontStyle="italic"
      >
        Re: denial of claim #847-221 — Aetna
      </text>

      {/* Handwritten body (rendered as subtle wavy ink strokes drawn in sequence) */}
      <g
        stroke="#1A1A17"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.82"
      >
        {lines.map((ln, i) => (
          <motion.path
            key={i}
            d={scribble(74, ln.y, ln.d)}
            pathLength={1}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.82 }}
            transition={{
              duration: 1.1,
              delay: 0.5 + i * 0.12,
              ease: editorialEase,
            }}
          />
        ))}
      </g>

      {/* Ochre highlight — drawn over one line like a highlighter pass */}
      <motion.rect
        x="110"
        y="350"
        height="22"
        rx="1"
        fill="#B6874A"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 230, opacity: 0.24 }}
        transition={{ duration: 0.7, delay: 1.8, ease: editorialEase }}
      />

      {/* Signature */}
      <motion.path
        d="M 78 702 Q 96 684 118 702 Q 138 716 156 700 Q 174 686 200 710 Q 220 724 236 716 Q 252 710 260 702"
        stroke="#1A1A17"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        pathLength={1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 2.4, ease: editorialEase }}
      />

      {/* "Signed" pressmark */}
      <circle
        cx="470"
        cy="712"
        r="32"
        fill="none"
        stroke="#B6874A"
        strokeWidth="0.8"
        opacity="0.55"
      />
      <text
        x="470"
        y="708"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="9"
        fill="#B6874A"
        letterSpacing="1"
      >
        UNWRITTEN
      </text>
      <text
        x="470"
        y="722"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="8"
        fill="#B6874A"
        letterSpacing="1.5"
        opacity="0.8"
      >
        · APPEAL ·
      </text>
    </svg>
  );
}

// Build a slightly-wavy horizontal path starting at (x, y) with length `d`.
function scribble(x: number, y: number, d: number): string {
  const segs = 8;
  const step = d / segs;
  let path = `M ${x} ${y}`;
  for (let i = 1; i <= segs; i++) {
    const cx = x + step * (i - 0.5);
    const ex = x + step * i;
    const cy = y + (i % 2 === 0 ? -1.2 : 1.2);
    path += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${y}`;
  }
  return path;
}
