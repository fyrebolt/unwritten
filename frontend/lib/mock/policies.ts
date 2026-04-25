export type PolicyChunk = {
  id: string;
  title: string;
  source: string;
  page: number;
  section: string;
  quote: string;
  fullText: string;
};

export const policyChunks: Record<string, PolicyChunk> = {
  "policy-1": {
    id: "policy-1",
    title: "Anthem Blue Cross — Evidence of Coverage, §3.2.1",
    source: "Anthem CA Evidence of Coverage, Group 42A",
    page: 48,
    section: "§3.2.1 — Weight Management Therapies",
    quote:
      "Coverage for GLP-1 receptor agonists for weight management is permitted when the member has a body mass index (BMI) of 30 or greater, or 27 or greater with at least one weight-related comorbidity.",
    fullText:
      "Anthem will provide coverage for GLP-1 receptor agonists (including but not limited to semaglutide, liraglutide, and tirzepatide) for weight management when the following criteria are met: (a) a body mass index (BMI) of 30 or greater, or (b) a BMI of 27 or greater with at least one weight-related comorbidity including but not limited to type 2 diabetes mellitus, hypertension, or dyslipidemia. Prior authorization is not required when the member satisfies either criterion.",
  },
  "policy-2": {
    id: "policy-2",
    title: "Anthem Medical Policy Bulletin CG-DME-48",
    source: "Anthem Medical Policy Bulletin",
    page: 7,
    section: "Clinical Criteria for Semaglutide",
    quote:
      "Semaglutide (Ozempic) is considered medically necessary for members with type 2 diabetes mellitus and an A1C of 7.0% or greater.",
    fullText:
      "Semaglutide (Ozempic) is considered medically necessary for members with a documented diagnosis of type 2 diabetes mellitus (ICD-10 E11.9) and either (a) an A1C of 7.0% or greater at time of prescription, or (b) documented intolerance to first-line therapy with metformin. Concurrent use of SGLT2 inhibitors is permitted.",
  },
  "evidence-1": {
    id: "evidence-1",
    title: "AACE/ACE Clinical Practice Guideline 2023",
    source: "American Association of Clinical Endocrinology, 2023 Guidelines",
    page: 24,
    section: "Pharmacologic Management — Type 2 Diabetes",
    quote:
      "GLP-1 receptor agonists are recommended as a preferred second-line therapy in patients with type 2 diabetes mellitus who have not achieved glycemic targets on metformin.",
    fullText:
      "In patients with type 2 diabetes mellitus who have not achieved glycemic targets despite three months of metformin monotherapy, the Panel recommends the addition of a GLP-1 receptor agonist or SGLT2 inhibitor over sulfonylureas and DPP-4 inhibitors, based on evidence of superior A1C reduction and cardiovascular risk mitigation (Grade A recommendation).",
  },
  "evidence-2": {
    id: "evidence-2",
    title: "N Engl J Med 2021 — SUSTAIN-6 Trial",
    source: "New England Journal of Medicine, 2021",
    page: 1,
    section: "Cardiovascular Outcomes",
    quote:
      "Once-weekly semaglutide reduced the risk of major cardiovascular events by 26% compared with placebo.",
    fullText:
      "In the SUSTAIN-6 trial of 3,297 patients with type 2 diabetes and high cardiovascular risk, once-weekly subcutaneous semaglutide reduced the composite primary endpoint of cardiovascular death, nonfatal myocardial infarction, and nonfatal stroke by 26% compared with placebo (HR 0.74, 95% CI 0.58–0.95, p<0.001 for noninferiority; p=0.02 for superiority).",
  },
  "patient-1": {
    id: "patient-1",
    title: "Patient medical record — Dr. M. Reyes, 03.02.2026",
    source: "Treating Physician Letter",
    page: 1,
    section: "Clinical Summary",
    quote:
      "Member's BMI is 31.4 and A1C is 7.8%. First-line therapy with metformin was attempted but discontinued due to GI intolerance.",
    fullText:
      "The member is a 48-year-old patient with a documented diagnosis of type 2 diabetes mellitus (E11.9) and a BMI of 31.4 as of 02.28.2026. A1C at time of this evaluation is 7.8%. Metformin 1000mg BID was attempted between October 2025 and January 2026 and was discontinued due to persistent gastrointestinal intolerance. I recommend initiation of semaglutide 1.0mg once weekly.",
  },
  "regulatory-1": {
    id: "regulatory-1",
    title: "ERISA §503 — Appeal Procedures",
    source: "29 CFR 2560.503-1",
    page: 12,
    section: "Timeframe for Plan Determination",
    quote:
      "A plan must render a decision on an appeal within 30 calendar days of receipt for pre-service claims.",
    fullText:
      "For pre-service claims, a plan administrator must notify the claimant of the plan's benefit determination on review within 30 calendar days of receipt of the appeal. Failure to comply entitles the claimant to pursue an external independent review without further internal process.",
  },
};
