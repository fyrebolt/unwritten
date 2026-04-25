export type AgentKind =
  | "intake"
  | "policy"
  | "evidence"
  | "drafting"
  | "delivery"
  | "tracking";

export type AgentState = "waiting" | "working" | "done";

export type AgentEvent = {
  id: string;
  agent: AgentKind;
  label: string;
  action: string;
  result?: string;
  state: AgentState;
  atSeconds: number;
  durationMs: number;
};

export const agentLabels: Record<AgentKind, string> = {
  intake: "INTAKE AGENT",
  policy: "POLICY AGENT",
  evidence: "EVIDENCE AGENT",
  drafting: "DRAFTING AGENT",
  delivery: "DELIVERY AGENT",
  tracking: "TRACKING AGENT",
};

export const agentDotColors: Record<AgentKind, string> = {
  intake: "#9A938A",
  policy: "#4E7A7A",
  evidence: "#B87060",
  drafting: "#B6874A",
  delivery: "#6B7A5C",
  tracking: "#46443D",
};

// A cinematic 20-second simulation.
export const workspaceScript: AgentEvent[] = [
  {
    id: "ev-1",
    agent: "intake",
    label: agentLabels.intake,
    action: "Parsing denial letter and voice transcript…",
    state: "working",
    atSeconds: 0.2,
    durationMs: 2800,
    result:
      "Identified insurer (Anthem Blue Cross), member ID, service (semaglutide), and denial rationale (not medically necessary).",
  },
  {
    id: "ev-2",
    agent: "policy",
    label: agentLabels.policy,
    action: "Searching Anthem CA formulary for GLP-1 coverage…",
    state: "working",
    atSeconds: 2.9,
    durationMs: 4600,
    result:
      "Retrieved 4 policy chunks. Top match: §3.2.1 of EOC — coverage permitted when BMI ≥ 30 or 27 with comorbidity.",
  },
  {
    id: "ev-3",
    agent: "evidence",
    label: agentLabels.evidence,
    action: "Locating supporting clinical evidence for semaglutide…",
    state: "working",
    atSeconds: 6.2,
    durationMs: 4400,
    result:
      "Retrieved 7 peer-reviewed sources and 2 guideline recommendations. AACE 2023 guideline supports semaglutide for type-2 diabetes.",
  },
  {
    id: "ev-4",
    agent: "policy",
    label: agentLabels.policy,
    action: "Cross-referencing the denial rationale with patient record…",
    state: "working",
    atSeconds: 9.8,
    durationMs: 2400,
    result:
      "Denial claims no medical necessity; patient record shows BMI 31.4, A1C 7.8 — coverage criteria are met.",
  },
  {
    id: "ev-5",
    agent: "drafting",
    label: agentLabels.drafting,
    action: "Assembling formal appeal letter with citations…",
    state: "working",
    atSeconds: 12.4,
    durationMs: 5200,
    result:
      "Generated 4-paragraph formal appeal. 6 citations, ERISA timeline reference, demand for external review if denied.",
  },
  {
    id: "ev-6",
    agent: "delivery",
    label: agentLabels.delivery,
    action: "Preparing fax envelope for Anthem Appeals Dept…",
    state: "working",
    atSeconds: 17.2,
    durationMs: 2600,
    result:
      "Prepared fax to +1 (559) 662-1000. Cover page and attachments attached. Awaiting user review.",
  },
];

// Agent config (user-adjustable knobs).
export type AgentConfig = {
  drafting: {
    tone: number; // 0 formal → 1 direct
    citationDensity: number; // 0 minimal → 1 exhaustive
    letterLength: number; // 0 concise → 1 comprehensive
    includeNarrative: boolean;
  };
  policy: {
    retrievalBreadth: number; // 0 focused → 1 wide
    includeBulletins: boolean;
    includeFormulary: boolean;
  };
  evidence: {
    recency: number; // 0 last-5y → 1 landmark
    includeFDA: boolean;
    guidelinesOnly: boolean;
  };
  delivery: {
    method: "fax" | "email" | "portal";
    copyToPatient: boolean;
  };
};

export const defaultAgentConfig: AgentConfig = {
  drafting: {
    tone: 0.3,
    citationDensity: 0.7,
    letterLength: 0.5,
    includeNarrative: true,
  },
  policy: {
    retrievalBreadth: 0.5,
    includeBulletins: true,
    includeFormulary: true,
  },
  evidence: {
    recency: 0.3,
    includeFDA: true,
    guidelinesOnly: false,
  },
  delivery: {
    method: "fax",
    copyToPatient: true,
  },
};

export const agentSystemPrompts: Record<AgentKind, string> = {
  intake: `You are the Intake Agent.
Parse the patient's denial letter and voice/chat intake. Extract insurer, plan type, member ID, service denied, denial reason, and any clinical context.
Redact PII that is not needed downstream. Return structured JSON.`,
  policy: `You are the Policy Agent.
Given the insurer, plan, and denied service, retrieve the most relevant policy chunks: Evidence of Coverage sections, medical policy bulletins, formulary exclusions, and any state regulations that bear on the case.
Return a ranked list with citations.`,
  evidence: `You are the Evidence Agent.
Given the service denied and the patient's clinical picture, retrieve peer-reviewed clinical evidence and current guideline recommendations.
Prefer systematic reviews and specialty-society guidelines.`,
  drafting: `You are the Drafting Agent.
Assemble a formal appeal letter in the voice of a patient advocate. Cite the policy and clinical evidence inline with superscript markers.
Include the ERISA 30-day timeline and request for external review if denied.`,
  delivery: `You are the Delivery Agent.
Prepare the appeal for transmission via fax, email, or insurer portal according to the patient's preference.
Generate a cover page; produce attachments; log a transmission receipt.`,
  tracking: `You are the Tracking Agent.
Monitor the insurer's response channels. Log acknowledgments, requests for additional records, and the final determination.
Surface deadlines and next-step opportunities.`,
};
