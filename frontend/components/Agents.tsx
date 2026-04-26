"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { editorialEase, durations } from "@/lib/motion";

type Agent = {
  number: string;
  title: string;
  description: string;
  tags: string;
};

const agents: Agent[] = [
  {
    number: "01",
    title: "Intake",
    description:
      "Listens to a denial in the patient's own words. Transcribes the recording, parses the uploaded letter, and extracts insurer, treatment, and denial reason into a structured case file.",
    tags: "Gemini 2.5 · PyPDF",
  },
  {
    number: "02",
    title: "Policy",
    description:
      "Reads the insurer's clinical policy bulletins line by line. Surfaces the carve-out, exception, or precedent that turns a denial into a defensible appeal.",
    tags: "uAgents · Fetch.ai",
  },
  {
    number: "03",
    title: "Evidence",
    description:
      "Searches medical literature for the studies, society guidelines, and FDA labels that justify the requested care. Returns citations the drafter can quote verbatim.",
    tags: "uAgents · Fetch.ai",
  },
  {
    number: "04",
    title: "Drafter",
    description:
      "Composes the appeal letter — formatted to the plan's specifications, with every clinical and policy claim backed by a verifiable source.",
    tags: "Gemini 2.5 · uAgents",
  },
  {
    number: "05",
    title: "Orchestrator",
    description:
      "Routes messages between the four agents and tracks each case through intake, research, drafting, and delivery. The conductor of the network.",
    tags: "uAgents Workflow",
  },
];

const CARDS_DELAY = 0.2;
const STAGGER = 0.08;

export function Agents() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduced = useReducedMotion();
  const yFrom = reduced ? 0 : 12;

  return (
    <section
      id="agents"
      ref={ref}
      aria-label="The agents behind Unwritten"
      className="relative py-48 md:py-64"
    >
      <div className="mx-auto max-w-[88rem] px-6 md:px-12 lg:px-20">
        <div className="mb-24 max-w-[64rem]">
          <motion.p
            initial={{ opacity: 0, y: yFrom }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: durations.medium, ease: editorialEase }}
            className="mb-6 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-muted"
          >
            The agents
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: yFrom }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{
              duration: durations.medium,
              ease: editorialEase,
              delay: 0.08,
            }}
            className="font-serif text-display-sm font-normal leading-[1.05] tracking-tight text-ink"
          >
            Five specialists.{" "}
            <em className="italic text-ink-muted">One appeal.</em>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: yFrom }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{
              duration: durations.medium,
              ease: editorialEase,
              delay: 0.16,
            }}
            className="mt-8 max-w-reading font-sans text-[1.0625rem] leading-[1.6] text-ink-muted md:text-[1.125rem]"
          >
            Behind every Unwritten letter is a small network of agents — each
            with a single, narrow job, each handing off cleanly to the next.
            They live on Fetch.ai&rsquo;s Agentverse and are searchable via
            ASI:One.
          </motion.p>
        </div>

        <ul className="grid grid-cols-1 items-stretch md:grid-cols-5">
          {agents.map((agent, i) => (
            <motion.li
              key={agent.number}
              initial={{ opacity: 0, y: yFrom }}
              animate={inView ? { opacity: 1, y: 0 } : undefined}
              transition={{
                duration: durations.medium,
                ease: editorialEase,
                delay: CARDS_DELAY + i * STAGGER,
              }}
              className="group relative border-t border-rule first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0"
            >
              <div className="flex h-full flex-col px-6 py-10 transition-transform duration-200 ease-editorial motion-safe:group-hover:-translate-y-1 md:px-7 md:py-2 lg:px-8">
                <span className="block font-serif text-[3.25rem] font-normal leading-none tracking-tight text-ochre transition-colors duration-200 ease-editorial group-hover:text-[#9a6a2c]">
                  {agent.number}
                </span>
                <h3 className="mt-6 font-serif text-[1.75rem] font-normal leading-[1.1] tracking-tight text-ink">
                  {agent.title}
                </h3>
                <p className="mt-4 flex-1 font-sans text-[0.9375rem] leading-[1.55] text-ink-muted">
                  {agent.description}
                </p>
                <p className="mt-8 font-sans text-eyebrow uppercase tracking-eyebrow text-ink-faint">
                  {agent.tags}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{
            duration: durations.medium,
            ease: editorialEase,
            delay: CARDS_DELAY + agents.length * STAGGER + 0.16,
          }}
          className="mt-24 text-center font-serif text-[clamp(1.125rem,1.4vw,1.25rem)] italic leading-[1.5] text-ink-muted"
        >
          Discoverable on{" "}
          <a
            href="https://fetch.ai"
            target="_blank"
            rel="noreferrer"
            className="text-ink underline decoration-ochre/40 underline-offset-4 transition-colors duration-200 ease-editorial hover:text-ochre hover:decoration-ochre"
          >
            Fetch.ai
          </a>
          &rsquo;s Agentverse. Searchable via ASI:One.
        </motion.p>
      </div>
    </section>
  );
}
