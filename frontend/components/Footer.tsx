"use client";

import { motion } from "framer-motion";
import { editorialEase } from "@/lib/motion";

const productLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Begin an appeal", href: "#intake" },
];

const companyLinks = [
  { label: "Manifesto", href: "#" },
  { label: "Press", href: "#" },
  { label: "Contact", href: "mailto:hello@unwritten.health" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-rule bg-paper pt-24" aria-label="Site footer">
      <div className="mx-auto max-w-[88rem] px-6 md:px-12 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: editorialEase }}
          className="grid grid-cols-1 gap-16 md:grid-cols-5"
        >
          {/* Wordmark + manifesto */}
          <div className="md:col-span-3">
            <p className="font-serif text-[2.75rem] leading-none tracking-tight text-ink">
              Unwritten<span className="text-ochre">.</span>
            </p>
            <p className="mt-8 max-w-[28rem] font-serif text-[1.25rem] leading-[1.4] text-ink-muted">
              The appeal they never expected. The outcome that wasn&rsquo;t
              written yet.
            </p>
          </div>

          {/* Nav columns */}
          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Company" links={companyLinks} />
        </motion.div>

        {/* Bottom strip */}
        <div className="mt-24 flex flex-col items-start justify-between gap-6 border-t border-rule py-8 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint md:flex-row md:items-center">
          <p>© 2026 Unwritten. Los Angeles.</p>
          <p>Made during LA Hacks.</p>
          <p className="inline-flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-block h-[1px] w-8 bg-ochre"
            />
            For those denied
          </p>
        </div>
      </div>

      {/* Oversized wordmark at bleed */}
      <div
        aria-hidden="true"
        className="relative mt-12 overflow-hidden"
      >
        <p className="select-none whitespace-nowrap text-center font-serif text-[clamp(8rem,22vw,22rem)] leading-[0.9] tracking-[-0.04em] text-ink/5">
          Unwritten.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <nav aria-label={title} className="min-w-0">
      <p className="mb-6 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint">
        {title}
      </p>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="group inline-flex items-center gap-2 font-sans text-[0.9375rem] text-ink transition-colors duration-200 ease-editorial hover:text-ochre"
            >
              <span
                aria-hidden="true"
                className="inline-block w-0 overflow-hidden transition-[width,margin] duration-300 ease-editorial group-hover:w-3 group-hover:mr-1"
              >
                →
              </span>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
