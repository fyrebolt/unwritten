/**
 * Clerk theming so the hosted Sign In / Sign Up components feel native to the
 * editorial palette (paper / ink / ochre, hairline rules, serif headings).
 * Clerk lets us pass arbitrary class names per element via `elements`.
 */
/**
 * Untyped on purpose — the Appearance type lives in `@clerk/types` (transitively
 * pulled in by @clerk/nextjs but not re-exported). The shape below is what
 * ClerkProvider's `appearance` prop accepts.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#b6874a",
    colorBackground: "#f6f1e7",
    colorText: "#1c160c",
    colorTextSecondary: "#6b6258",
    colorInputBackground: "#f6f1e7",
    colorInputText: "#1c160c",
    colorDanger: "#a9453c",
    fontFamily: "var(--font-serif), Instrument Serif, Georgia, serif",
    fontFamilyButtons: "var(--font-sans), Geist, system-ui, sans-serif",
    borderRadius: "0",
  },
  elements: {
    rootBox: "w-full",
    card:
      "shadow-none border-0 bg-transparent p-0",
    headerTitle:
      "font-serif text-[1.85rem] leading-[1.1] tracking-tight text-ink",
    headerSubtitle: "font-sans text-[12px] text-ink-muted",
    socialButtonsBlockButton:
      "border border-rule bg-paper text-ink hover:border-ochre transition-colors",
    socialButtonsBlockButtonText:
      "font-sans text-[12px] uppercase tracking-[0.18em] text-ink",
    dividerLine: "bg-rule",
    dividerText:
      "font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint",
    formFieldLabel:
      "font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted",
    formFieldInput:
      "border-0 border-b border-rule bg-transparent rounded-none focus:border-ochre focus:ring-0 focus:border-b-2 font-sans text-[15px] text-ink",
    formButtonPrimary:
      "bg-ink text-paper hover:bg-ink/90 font-sans text-[12px] uppercase tracking-[0.18em] rounded-none px-5 py-3",
    footerActionLink: "text-ochre hover:text-ink",
    identityPreview: "border border-rule bg-paper",
    formResendCodeLink: "text-ochre hover:text-ink",
    otpCodeFieldInput:
      "border-0 border-b border-rule bg-transparent rounded-none focus:border-ochre",
  },
};
