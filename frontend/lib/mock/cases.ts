export type CaseStatus =
  | "DRAFTING"
  | "AWAITING FAX CONFIRMATION"
  | "INSURER RESPONDED"
  | "APPEAL APPROVED"
  | "APPEAL DENIED"
  | "NEEDS REVIEW";

export type MockCase = {
  id: string;
  title: string;
  insurer: string;
  planType: string;
  memberId: string;
  serviceDenied: string;
  denialReason: string;
  appealDeadline: string;
  status: CaseStatus;
  updatedAt: string;
  createdAt: string;
  completed: boolean;
};

export const mockCases: MockCase[] = [
  {
    id: "case_847221b",
    title: "Anthem — GLP-1 denial, March 2026",
    insurer: "Anthem Blue Cross",
    planType: "PPO · CA",
    memberId: "XGJ442198730",
    serviceDenied: "Semaglutide (Ozempic) 1.0mg weekly",
    denialReason: "Not medically necessary",
    appealDeadline: "April 6, 2026",
    status: "DRAFTING",
    updatedAt: "14 minutes ago",
    createdAt: "March 7, 2026",
    completed: false,
  },
  {
    id: "case_902145a",
    title: "Aetna — MRI denial, lumbar spine",
    insurer: "Aetna",
    planType: "HMO · CA",
    memberId: "W221447502",
    serviceDenied: "MRI, lumbar spine, without contrast",
    denialReason: "Prior authorization not obtained",
    appealDeadline: "April 12, 2026",
    status: "AWAITING FAX CONFIRMATION",
    updatedAt: "2 hours ago",
    createdAt: "March 4, 2026",
    completed: false,
  },
  {
    id: "case_558392c",
    title: "UnitedHealthcare — physical therapy",
    insurer: "UnitedHealthcare",
    planType: "Choice Plus",
    memberId: "9012448831",
    serviceDenied: "Physical therapy, extended course",
    denialReason: "Exceeds visit allowance",
    appealDeadline: "April 2, 2026",
    status: "NEEDS REVIEW",
    updatedAt: "yesterday",
    createdAt: "March 1, 2026",
    completed: false,
  },
  {
    id: "case_720118d",
    title: "Kaiser — gene therapy denial",
    insurer: "Kaiser Permanente",
    planType: "Senior Advantage",
    memberId: "110298331",
    serviceDenied: "Targeted oncology panel",
    denialReason: "Experimental/investigational",
    appealDeadline: "February 22, 2026",
    status: "APPEAL APPROVED",
    updatedAt: "9 days ago",
    createdAt: "February 1, 2026",
    completed: true,
  },
  {
    id: "case_310294e",
    title: "Cigna — infusion therapy denial",
    insurer: "Cigna",
    planType: "Open Access Plus",
    memberId: "U442097112",
    serviceDenied: "IVIG infusion protocol",
    denialReason: "Lacks supporting documentation",
    appealDeadline: "January 30, 2026",
    status: "APPEAL APPROVED",
    updatedAt: "3 weeks ago",
    createdAt: "January 7, 2026",
    completed: true,
  },
];

export function getCase(id: string): MockCase | undefined {
  return mockCases.find((c) => c.id === id);
}

export function getActiveCases(): MockCase[] {
  return mockCases.filter((c) => !c.completed);
}

export function getCompletedCases(): MockCase[] {
  return mockCases.filter((c) => c.completed);
}

export function newDraftCase(): MockCase {
  const id = `case_${Date.now().toString(36)}`;
  return {
    id,
    title: "Anthem — GLP-1 denial, March 2026",
    insurer: "Anthem Blue Cross",
    planType: "PPO · CA",
    memberId: "XGJ442198730",
    serviceDenied: "Semaglutide (Ozempic) 1.0mg weekly",
    denialReason: "Not medically necessary",
    appealDeadline: "April 6, 2026",
    status: "DRAFTING",
    updatedAt: "just now",
    createdAt: "today",
    completed: false,
  };
}
