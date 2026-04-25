export type LetterSentence = {
  text: string;
  citations: string[]; // policyChunks ids
};

export type LetterParagraph = {
  lead: string;
  sentences: LetterSentence[];
};

export const appealLetter: {
  header: { appeal: string; date: string; via: string; office: string };
  subject: string;
  paragraphs: LetterParagraph[];
  closing: string;
} = {
  header: {
    appeal: "APPEAL · 847-221-B",
    date: "03.14.2026",
    via: "FAX · USPS",
    office: "OFFICE OF MEMBER ADVOCACY",
  },
  subject: "Formal appeal — member denial, dated 03.07.2026",
  paragraphs: [
    {
      lead: "",
      sentences: [
        {
          text: "We write on behalf of the above-referenced member to appeal the denial of coverage issued on March 7, 2026.",
          citations: [],
        },
        {
          text: "The denial asserts that the requested procedure was not medically necessary; the member's treating physician has certified otherwise, supported by imaging and prior conservative treatment.",
          citations: ["patient-1"],
        },
        {
          text: "The denial further cites a missing prior authorization; however, the plan's own utilization management policy, §4.2, waives this requirement under the clinical criteria met by the member's condition.",
          citations: ["policy-1"],
        },
        {
          text: "Under ERISA §503 and 29 CFR 2560.503-1, we respectfully request that the plan render a determination on this appeal within the 30 calendar days required by federal regulation.",
          citations: ["regulatory-1"],
        },
      ],
    },
    {
      lead: "Clinical basis.",
      sentences: [
        {
          text: "The member presents with documented type 2 diabetes mellitus (E11.9) and a BMI of 31.4, satisfying both the formulary-level and medical-policy-level coverage criteria set forth in the Evidence of Coverage and in Medical Policy Bulletin CG-DME-48.",
          citations: ["policy-1", "policy-2"],
        },
        {
          text: "First-line therapy with metformin was attempted and discontinued due to intolerance; the American Association of Clinical Endocrinology 2023 guidelines recommend a GLP-1 receptor agonist as the preferred second-line agent in this circumstance.",
          citations: ["patient-1", "evidence-1"],
        },
        {
          text: "Published cardiovascular outcomes data further support the requested therapy in this patient population.",
          citations: ["evidence-2"],
        },
      ],
    },
    {
      lead: "Procedural note.",
      sentences: [
        {
          text: "Should the plan uphold its denial, we will proceed to external independent review and request an expedited determination consistent with the patient's clinical urgency.",
          citations: ["regulatory-1"],
        },
        {
          text: "We thank you for your attention to this matter and await your written response.",
          citations: [],
        },
      ],
    },
  ],
  closing: "Sincerely, — Unwritten Member Advocacy",
};

export function letterPlainText(): string {
  return appealLetter.paragraphs
    .map((p) => {
      const lead = p.lead ? `${p.lead} ` : "";
      return lead + p.sentences.map((s) => s.text).join(" ");
    })
    .join("\n\n");
}
