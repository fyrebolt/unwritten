"use client";

import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { defaultAgentConfig, type AgentConfig } from "@/lib/mock/agents";
import { SliderRow, SwitchRow, RadioRow } from "./ConfigControls";

export function AgentConfigDrawer({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApply?: () => void;
}) {
  const [config, setConfig] = useState<AgentConfig>(defaultAgentConfig);

  const update = <K extends keyof AgentConfig>(
    section: K,
    patch: Partial<AgentConfig[K]>,
  ) => setConfig((c) => ({ ...c, [section]: { ...c[section], ...patch } }));

  const apply = () => {
    toast.success("Agent config applied", {
      description: "Your letter will regenerate with the new settings.",
    });
    onApply?.();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} label="Agent configuration" width={540}>
      <DrawerHeader
        eyebrow="Tune the agents"
        title="Agent configuration"
        subtitle="Adjust how each agent retrieves, reasons, and writes."
        onClose={() => onOpenChange(false)}
      />
      <DrawerBody>
        <Tabs.Root defaultValue="drafting" className="flex h-full flex-col">
          <Tabs.List className="flex gap-6 border-b border-rule">
            {[
              ["drafting", "Drafting"],
              ["policy", "Policy"],
              ["evidence", "Evidence"],
              ["delivery", "Delivery"],
            ].map(([v, l]) => (
              <Tabs.Trigger
                key={v}
                value={v}
                className="group relative -mb-px border-b border-transparent pb-3 font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted transition-colors duration-200 ease-editorial data-[state=active]:border-ochre data-[state=active]:text-ink"
              >
                {l}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="flex-1 overflow-y-auto pt-8">
            <Tabs.Content value="drafting" className="space-y-8">
              <SliderRow
                label="Tone"
                minLabel="Formal"
                maxLabel="Direct"
                value={config.drafting.tone}
                onChange={(v) => update("drafting", { tone: v })}
              />
              <SliderRow
                label="Citation density"
                minLabel="Minimal"
                maxLabel="Exhaustive"
                value={config.drafting.citationDensity}
                onChange={(v) => update("drafting", { citationDensity: v })}
              />
              <SliderRow
                label="Letter length"
                minLabel="Concise"
                maxLabel="Comprehensive"
                value={config.drafting.letterLength}
                onChange={(v) => update("drafting", { letterLength: v })}
              />
              <SwitchRow
                label="Include patient narrative"
                description="Open with a short human account before the legal argument."
                checked={config.drafting.includeNarrative}
                onChange={(v) => update("drafting", { includeNarrative: v })}
              />
            </Tabs.Content>

            <Tabs.Content value="policy" className="space-y-8">
              <SliderRow
                label="Retrieval breadth"
                minLabel="Focused"
                maxLabel="Wide"
                value={config.policy.retrievalBreadth}
                onChange={(v) => update("policy", { retrievalBreadth: v })}
              />
              <SwitchRow
                label="Include medical policy bulletins"
                description="Pull the insurer's internal clinical bulletins alongside EOC."
                checked={config.policy.includeBulletins}
                onChange={(v) => update("policy", { includeBulletins: v })}
              />
              <SwitchRow
                label="Include formulary"
                description="Check the member's formulary tier and exclusion list."
                checked={config.policy.includeFormulary}
                onChange={(v) => update("policy", { includeFormulary: v })}
              />
            </Tabs.Content>

            <Tabs.Content value="evidence" className="space-y-8">
              <SliderRow
                label="Evidence recency"
                minLabel="Last 5 years"
                maxLabel="Landmark trials"
                value={config.evidence.recency}
                onChange={(v) => update("evidence", { recency: v })}
              />
              <SwitchRow
                label="Include FDA label"
                description="Cite the manufacturer's FDA-approved indications."
                checked={config.evidence.includeFDA}
                onChange={(v) => update("evidence", { includeFDA: v })}
              />
              <SwitchRow
                label="Guidelines only"
                description="Restrict to specialty-society guideline recommendations."
                checked={config.evidence.guidelinesOnly}
                onChange={(v) => update("evidence", { guidelinesOnly: v })}
              />
            </Tabs.Content>

            <Tabs.Content value="delivery" className="space-y-8">
              <RadioRow
                label="Delivery method"
                value={config.delivery.method}
                onChange={(v) =>
                  update("delivery", { method: v as "fax" | "email" | "portal" })
                }
                options={[
                  { value: "fax", label: "Fax" },
                  { value: "email", label: "Email" },
                  { value: "portal", label: "Insurer portal" },
                ]}
              />
              <SwitchRow
                label="Copy the patient"
                description="Send a cleaned-up plain-English summary to the patient."
                checked={config.delivery.copyToPatient}
                onChange={(v) => update("delivery", { copyToPatient: v })}
              />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </DrawerBody>
      <DrawerFooter>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={apply}>
          Apply to current case
        </Button>
      </DrawerFooter>
    </Drawer>
  );
}
