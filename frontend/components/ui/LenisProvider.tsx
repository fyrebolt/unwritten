"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    // Opt-out hook for programmatic testing (?lenis=off disables smooth scroll)
    if (new URLSearchParams(window.location.search).get("lenis") === "off") {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.08,
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });

    // Bridge Lenis → native scroll event so libraries listening on `scroll`
    // (Framer Motion's useScroll, IntersectionObserver polyfills, etc.) pick
    // up Lenis-driven scroll position updates.
    const forwardScroll = () => {
      window.dispatchEvent(new Event("scroll"));
    };
    lenis.on("scroll", forwardScroll);

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      lenis.off("scroll", forwardScroll);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
