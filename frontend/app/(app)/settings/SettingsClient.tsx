"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SliderRow, SwitchRow, RadioRow } from "@/app/(app)/case/[id]/panels/ConfigControls";
import { defaultAgentConfig, type AgentConfig } from "@/lib/mock/agents";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "agent-config", label: "Agent config" },
  { id: "notifications", label: "Notifications" },
  { id: "delivery", label: "Delivery" },
  { id: "billing", label: "Billing" },
  { id: "danger", label: "Danger zone" },
] as const;

export function SettingsClient() {
  const { user } = useUser();
  const displayName = user?.fullName ?? user?.firstName ?? user?.username ?? "Member";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const [config, setConfig] = useState<AgentConfig>(defaultAgentConfig);

  const updateConfig = <K extends keyof AgentConfig>(
    section: K,
    patch: Partial<AgentConfig[K]>,
  ) => setConfig((c) => ({ ...c, [section]: { ...c[section], ...patch } }));

  const saveProfile = () => {
    toast.success("Profile sync handled by Clerk", {
      description: "Email + display name come from your Clerk account.",
    });
  };

  return (
    <div className="mx-auto max-w-[48rem] px-6 py-16 md:py-24">
      <header className="mb-20">
        <Eyebrow>Settings</Eyebrow>
        <h1 className="mt-3 font-serif text-[clamp(2rem,3.5vw,3rem)] leading-[1.05] tracking-tight text-ink">
          Your workspace.
        </h1>
        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="transition-colors duration-200 ease-editorial hover:text-ochre"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-40">
        <section id="profile" className="scroll-mt-24">
          <Eyebrow>Profile</Eyebrow>
          <h2 className="mt-3 font-serif text-[1.6rem] leading-[1.2] tracking-tight text-ink">
            Who this is for.
          </h2>
          <div className="mt-10 flex flex-col gap-8">
            <Field label="Display name">
              <Input sizeVariant="md" value={displayName} readOnly />
            </Field>
            <Field label="Email">
              <Input sizeVariant="md" value={email} readOnly />
            </Field>
            <Field label="Clinic / organization">
              <Input sizeVariant="md" defaultValue="West Oak Endocrinology" />
            </Field>
            <p className="font-sans text-[11px] text-ink-muted">
              Identity is managed by Clerk — change your name or email at{" "}
              <a
                href="https://accounts.clerk.com"
                target="_blank"
                rel="noreferrer"
                className="text-ochre underline-offset-4 hover:underline"
              >
                Clerk account
              </a>
              .
            </p>
            <div className="flex justify-end pt-4">
              <Button variant="primary" size="sm" onClick={saveProfile}>
                Save profile
              </Button>
            </div>
          </div>
        </section>

        <section id="agent-config" className="scroll-mt-24">
          <Eyebrow>Agent config · Defaults</Eyebrow>
          <h2 className="mt-3 font-serif text-[1.6rem] leading-[1.2] tracking-tight text-ink">
            How we write, by default.
          </h2>
          <p className="mt-4 max-w-[52ch] font-serif text-[1rem] leading-[1.65] text-ink-muted">
            These preferences apply to new cases. You can still tune each case
            individually from the workspace.
          </p>
          <div className="mt-12 space-y-10">
            <SliderRow
              label="Drafting tone"
              minLabel="Formal"
              maxLabel="Direct"
              value={config.drafting.tone}
              onChange={(v) => updateConfig("drafting", { tone: v })}
            />
            <SliderRow
              label="Citation density"
              minLabel="Minimal"
              maxLabel="Exhaustive"
              value={config.drafting.citationDensity}
              onChange={(v) => updateConfig("drafting", { citationDensity: v })}
            />
            <SwitchRow
              label="Patient narrative"
              description="Begin letters with a short human account before the legal argument."
              checked={config.drafting.includeNarrative}
              onChange={(v) => updateConfig("drafting", { includeNarrative: v })}
            />
          </div>
        </section>

        <section id="notifications" className="scroll-mt-24">
          <Eyebrow>Notifications</Eyebrow>
          <h2 className="mt-3 font-serif text-[1.6rem] leading-[1.2] tracking-tight text-ink">
            What we ping you about.
          </h2>
          <div className="mt-10 space-y-8">
            <SwitchRow
              label="Insurer responses"
              description="Email and in-app when an insurer acknowledges or responds."
              checked
              onChange={() => undefined}
            />
            <SwitchRow
              label="Deadline reminders"
              description="Three-day and one-day reminders before an appeal deadline."
              checked
              onChange={() => undefined}
            />
            <SwitchRow
              label="Weekly digest"
              description="Monday morning summary of active cases and pending actions."
              checked={false}
              onChange={() => undefined}
            />
          </div>
        </section>

        <section id="delivery" className="scroll-mt-24">
          <Eyebrow>Delivery</Eyebrow>
          <h2 className="mt-3 font-serif text-[1.6rem] leading-[1.2] tracking-tight text-ink">
            How letters go out.
          </h2>
          <div className="mt-10 space-y-8">
            <RadioRow
              label="Default method"
              value={config.delivery.method}
              onChange={(v) =>
                updateConfig("delivery", { method: v as "fax" | "email" | "portal" })
              }
              options={[
                { value: "fax", label: "Fax" },
                { value: "email", label: "Email" },
                { value: "portal", label: "Portal" },
              ]}
            />
            <SwitchRow
              label="Copy the patient"
              description="Also send a plain-English summary to the patient's inbox."
              checked={config.delivery.copyToPatient}
              onChange={(v) => updateConfig("delivery", { copyToPatient: v })}
            />
          </div>
        </section>

        <section id="billing" className="scroll-mt-24">
          <Eyebrow>Billing</Eyebrow>
          <h2 className="mt-3 font-serif text-[1.6rem] leading-[1.2] tracking-tight text-ink">
            Advocate plan.
          </h2>
          <div className="mt-10 flex flex-col gap-6 border border-rule bg-paper p-8">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-serif text-[1.2rem] text-ink">Advocate</p>
                <p className="mt-1 font-sans text-[12px] text-ink-muted">
                  10 appeals included · $149/mo
                </p>
              </div>
              <p className="font-serif text-[1.1rem] text-ink">3 / 10 used</p>
            </div>
            <div className="h-px w-full bg-rule">
              <span className="block h-px bg-ochre" style={{ width: "30%" }} />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm">
                Manage plan
              </Button>
            </div>
          </div>
        </section>

        <section id="danger" className="scroll-mt-24">
          <Eyebrow className="text-[#a9453c]">Danger zone</Eyebrow>
          <h2 className="mt-3 font-serif text-[1.6rem] leading-[1.2] tracking-tight text-ink">
            Leave no trace.
          </h2>
          <div className="mt-10 flex flex-col gap-4 border border-[#a9453c]/30 p-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="font-serif text-[1.05rem] text-ink">Delete workspace</p>
                <p className="mt-1 max-w-[48ch] font-sans text-[12px] text-ink-muted">
                  Permanently remove your account, every case, and every
                  transmission receipt. This cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-[#a9453c]/40 text-[#a9453c] hover:border-[#a9453c] hover:text-[#a9453c]"
                onClick={() =>
                  toast.error("Not actually wired up", {
                    description: "This is the demo shell.",
                  })
                }
              >
                Delete
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[180px_1fr] items-baseline gap-4">
      <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
