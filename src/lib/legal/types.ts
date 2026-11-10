import { LegalDocType } from "@prisma/client";

// Days before a version's effectiveAt that we begin notifying users.
export const LEGAL_NOTICE_WINDOW_DAYS = 5;

export type DocVersionSummary = {
  id: string;
  version: number;
  effectiveAt: Date;
  summary: string | null;
};

export type DocState = {
  docType: LegalDocType;
  effective: DocVersionSummary | null; // must-accept version (effectiveAt <= now)
  announced: DocVersionSummary | null; // upcoming version (effectiveAt > now)
};

export type CurrentVersions = Record<LegalDocType, DocState>;

// Maps a doc type to the MDX source whose rendered text we archive on publish.
export const LEGAL_DOC_SOURCES: Record<LegalDocType, string> = {
  PRIVACY: "src/components/legal/PrivacyPolicy.mdx",
  TERMS: "src/components/legal/TermsOfUse.mdx",
};
