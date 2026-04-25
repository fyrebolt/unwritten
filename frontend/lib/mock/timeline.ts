export type TimelineState = "complete" | "pending" | "past";

export type TimelineEvent = {
  id: string;
  title: string;
  at: string;
  state: TimelineState;
  details?: string;
};

export const mockTimeline: TimelineEvent[] = [
  {
    id: "t-1",
    title: "Appeal submitted",
    at: "March 14 · 10:14 PM",
    state: "complete",
    details:
      "Fax transmission confirmed to Anthem Blue Cross Appeals Dept. (+1 559 662 1000).",
  },
  {
    id: "t-2",
    title: "Insurer acknowledged receipt",
    at: "March 15 · 9:32 AM",
    state: "complete",
    details:
      "Anthem acknowledged receipt via electronic reply. Case reference #A-2026-11329 assigned.",
  },
  {
    id: "t-3",
    title: "Insurer requested additional records",
    at: "March 18 · 2:47 PM",
    state: "complete",
    details:
      "Anthem requested the patient's full endocrinology chart for the prior 12 months. Request fulfilled within four hours.",
  },
  {
    id: "t-4",
    title: "Peer clinical review scheduled",
    at: "March 22 · 8:00 AM",
    state: "pending",
    details:
      "A board-certified endocrinologist is scheduled to perform a peer review of the appeal materials.",
  },
  {
    id: "t-5",
    title: "Determination due",
    at: "April 14 — 30-day window",
    state: "pending",
    details:
      "Per ERISA §503 and 29 CFR 2560.503-1, Anthem must render a determination by this date.",
  },
];
