import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "var(--paper)",
          deep: "var(--paper-deep)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          faint: "var(--ink-faint)",
        },
        ochre: {
          DEFAULT: "var(--ochre)",
          soft: "var(--ochre-soft)",
        },
        rule: "var(--rule)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        eyebrow: ["0.8125rem", { lineHeight: "1.2", letterSpacing: "0.12em" }],
        display: ["clamp(3.5rem, 9vw, 8rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-sm": ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "1.04", letterSpacing: "-0.02em" }],
      },
      letterSpacing: {
        eyebrow: "0.12em",
        tight: "-0.02em",
      },
      maxWidth: {
        reading: "38rem",
        prose: "42rem",
        panel: "32rem",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "ink-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "wave-bar": {
          "0%, 100%": { transform: "scaleY(0.2)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "ink-pulse": "ink-pulse 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
