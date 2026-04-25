"use client";

import { motion, useMotionTemplate, useScroll, useTransform } from "framer-motion";

export function TopNav() {
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 120], [0, 0.85]);
  const borderOpacity = useTransform(scrollY, [0, 120], [0, 0.14]);
  const bg = useMotionTemplate`rgba(246, 243, 236, ${bgOpacity})`;
  const borderColor = useMotionTemplate`rgba(26, 26, 23, ${borderOpacity})`;

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-40"
      aria-label="Primary navigation"
    >
      <motion.div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          background: bg,
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          borderBottomColor: borderColor,
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-[88rem] items-center justify-between px-6 py-5 md:px-12 lg:px-20">
        <a
          href="/"
          className="inline-flex items-center font-serif text-[1.5rem] leading-none tracking-tight text-ink"
        >
          Unwritten<span className="text-ochre">.</span>
        </a>

        <nav className="hidden items-center gap-10 md:flex" aria-label="Sections">
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
          <NavLink href="#">Manifesto</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/signin"
            className="hidden font-sans text-[11px] uppercase tracking-[0.18em] text-ink-muted transition-colors duration-200 ease-editorial hover:text-ochre md:inline"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="group relative inline-flex items-center gap-2 border border-ink/20 px-4 py-2 font-sans text-[11px] uppercase tracking-[0.18em] text-ink transition-colors duration-300 ease-editorial hover:border-ochre hover:text-ochre"
          >
            Begin
            <span
              aria-hidden="true"
              className="transition-transform duration-300 ease-editorial group-hover:translate-x-0.5"
            >
              →
            </span>
          </a>
        </div>
      </div>
    </motion.header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="group relative font-sans text-[13px] text-ink-muted transition-colors duration-200 ease-editorial hover:text-ink"
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute bottom-[-4px] left-0 h-px w-full origin-right scale-x-0 bg-ochre transition-transform duration-300 ease-editorial group-hover:origin-left group-hover:scale-x-100"
      />
    </a>
  );
}
