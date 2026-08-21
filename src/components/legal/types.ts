export type LegalBlock = string | { list: string[] };

export type LegalSectionData = {
  id: string;
  heading: string;
  body: LegalBlock[];
  // true if this section's specifics (governing law, liability, retention windows, etc.)
  // still need founder/attorney sign-off — tracked in docs/legal-review-required.md,
  // not shown to visitors as a badge.
  requiresLegalReview?: boolean;
};

export type LegalDocument = {
  title: string;
  description: string;
  path: string;
  effectiveDate: string;
  lastUpdated: string;
  intro?: string[];
  sections: LegalSectionData[];
  showContact?: boolean;
};
