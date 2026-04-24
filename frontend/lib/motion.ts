import type { Easing, Variants } from "framer-motion";

// The one easing to rule them all. Editorial, inevitable, never bouncy.
export const editorialEase: Easing = [0.22, 1, 0.36, 1];

export const durations = {
  micro: 0.22,
  small: 0.4,
  medium: 0.8,
  large: 1.2,
} as const;

export const staggerChildren = 0.08;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.medium, ease: editorialEase },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: durations.medium, ease: editorialEase },
  },
};

export const staggerParent: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren,
      delayChildren: 0.08,
    },
  },
};

export const revealLine: Variants = {
  hidden: { opacity: 0, y: "100%" },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.large, ease: editorialEase },
  },
};

// Scale + opacity crossfade used between HowItWorks mocks
export const crossfade: Variants = {
  enter: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.medium, ease: editorialEase },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: durations.small, ease: editorialEase },
  },
};
