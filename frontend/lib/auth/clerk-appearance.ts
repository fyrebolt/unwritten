/**
 * Clerk theming so the hosted Sign In / Sign Up components feel native to the
 * editorial palette (paper / ink / ochre, hairline rules, serif headings).
 *
 * Note: the heavy lifting lives in `app/clerk-theme.css`. Clerk's own scoped
 * styles win on specificity over Tailwind classes passed through
 * `appearance.elements`, so we let CSS handle layout/structure and use this
 * config purely for color tokens + typography variables.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#1a1a17",
    colorBackground: "#f6f3ec",
    colorText: "#1a1a17",
    colorTextSecondary: "#6b665c",
    colorTextOnPrimaryBackground: "#f6f3ec",
    colorInputBackground: "transparent",
    colorInputText: "#1a1a17",
    colorDanger: "#a9453c",
    colorSuccess: "#3c6e47",
    colorNeutral: "#1a1a17",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    fontFamilyButtons: "var(--font-sans), system-ui, sans-serif",
    fontSize: "14px",
    borderRadius: "0",
    spacingUnit: "0.95rem",
  },
  layout: {
    socialButtonsVariant: "blockButton" as const,
    socialButtonsPlacement: "top" as const,
    logoPlacement: "none" as const,
    showOptionalFields: true,
    helpPageUrl: "",
    privacyPageUrl: "",
    termsPageUrl: "",
  },
};
