export type DenialHighlight = {
  id: string;
  line: number; // index into DENIAL_LINES
  startChar?: number;
  length?: number;
  tag: "insurer" | "member" | "service" | "reason" | "deadline" | "signature";
};

export const DENIAL_HEADER = {
  insurerName: "ANTHEM BLUE CROSS OF CALIFORNIA",
  address: "P.O. Box 9063 · Oxnard, CA 93031",
  refLine: "Re: Claim #AX-4482-3310-CA · Member XGJ442198730",
  dateLine: "Date: March 7, 2026",
};

export const DENIAL_LINES: string[] = [
  "Dear Member,",
  "",
  "We have reviewed your request for coverage of the following medication under your Anthem PPO plan (Group 42A):",
  "",
  "    Semaglutide (Ozempic) 1.0mg, weekly subcutaneous injection",
  "",
  "After careful review of the clinical documentation submitted by your treating physician, your request for coverage of this medication has been denied.",
  "",
  "Reason for denial:",
  "",
  "    The requested medication is not considered medically necessary under the terms of your plan. Supporting documentation did not establish failure of first-line pharmacotherapy or comorbid conditions sufficient to meet the coverage criteria set forth in Medical Policy Bulletin CG-DME-48.",
  "",
  "If you disagree with this determination, you have the right to appeal. Appeals must be submitted in writing within 60 calendar days of the date of this notice. Please include supporting medical records and any additional information you wish to be considered.",
  "",
  "Sincerely,",
  "",
  "Mildred K. Chen, RN, MSN",
  "Director, Utilization Management",
  "Anthem Blue Cross of California",
];

export const DENIAL_HIGHLIGHTS: DenialHighlight[] = [
  { id: "h-insurer", line: 0, tag: "insurer" },
  { id: "h-member", line: 2, tag: "member" },
  { id: "h-service", line: 4, tag: "service" },
  { id: "h-reason", line: 10, tag: "reason" },
  { id: "h-deadline", line: 12, tag: "deadline" },
  { id: "h-signature", line: 16, tag: "signature" },
];

export type AgentFocus = {
  atSeconds: number;
  highlight: DenialHighlight["tag"];
};

export const agentFocusSchedule: AgentFocus[] = [
  { atSeconds: 0.6, highlight: "insurer" },
  { atSeconds: 1.5, highlight: "member" },
  { atSeconds: 2.4, highlight: "service" },
  { atSeconds: 3.5, highlight: "reason" },
  { atSeconds: 9.8, highlight: "reason" },
  { atSeconds: 10.8, highlight: "deadline" },
];
