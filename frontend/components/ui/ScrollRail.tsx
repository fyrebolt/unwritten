"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollRail() {
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    mass: 0.4,
  });

  return (
    <div className="scroll-rail" aria-hidden="true">
      <motion.div
        className="scroll-rail__fill"
        style={{ scaleY, bottom: 0, originY: 0 }}
      />
    </div>
  );
}
