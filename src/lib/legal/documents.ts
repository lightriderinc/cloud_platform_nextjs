import { db } from "@/lib/billing/db";
import { LegalDocType } from "@prisma/client";
import type { CurrentVersions, DocState, DocVersionSummary } from "./types";

function summarize(
  d: { id: string; version: number; effectiveAt: Date; summary: string | null } | undefined,
): DocVersionSummary | null {
  return d ? { id: d.id, version: d.version, effectiveAt: d.effectiveAt, summary: d.summary } : null;
}

/** The effective + announced version for every legal document type. */
export async function getCurrentVersions(now: Date = new Date()): Promise<CurrentVersions> {
  const docs = await db.legalDocument.findMany({
    orderBy: [{ docType: "asc" }, { version: "desc" }],
  });

  const state = {} as CurrentVersions;
  for (const type of Object.values(LegalDocType)) {
    const ofType = docs.filter((d) => d.docType === type);
    state[type] = {
      docType: type,
      effective: summarize(ofType.find((d) => d.effectiveAt <= now)),
      announced: summarize(ofType.find((d) => d.effectiveAt > now)),
    } satisfies DocState;
  }
  return state;
}

export type PublishVersionInput = {
  docType: LegalDocType;
  effectiveAt: Date;
  summary?: string;
  contentUrl?: string;
  contentHash?: string;
  publishedAt?: Date;
};

/** Inserts the next version of a legal document (version = current max + 1). */
export async function publishVersion(input: PublishVersionInput) {
  return db.$transaction(async (tx) => {
    const last = await tx.legalDocument.findFirst({
      where: { docType: input.docType },
      orderBy: { version: "desc" },
    });
    const version = (last?.version ?? 0) + 1;
    return tx.legalDocument.create({
      data: {
        docType: input.docType,
        version,
        effectiveAt: input.effectiveAt,
        publishedAt: input.publishedAt ?? new Date(),
        summary: input.summary,
        contentUrl: input.contentUrl,
        contentHash: input.contentHash,
      },
    });
  });
}
