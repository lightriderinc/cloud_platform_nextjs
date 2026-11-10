import { db } from "@/lib/billing/db";
import { LegalAcceptanceContext, LegalDocType, Prisma } from "@prisma/client";
import { getCurrentVersions } from "./documents";

export type RecordAcceptanceInput = {
  logtoUserId: string;
  docType: LegalDocType;
  documentId?: string; // defaults to the current effective version
  documentVersion?: number;
  context: LegalAcceptanceContext;
  ip?: string;
  userAgent?: string;
  acceptedAt?: Date;
};

/**
 * Records one acceptance. Idempotent per (user, document, context) via the
 * unique index — a retried webhook or double-click is swallowed, not doubled.
 * Returns true if a new row was written, false if it already existed.
 */
export async function recordAcceptance(input: RecordAcceptanceInput): Promise<boolean> {
  let { documentId, documentVersion } = input;

  if (!documentId || documentVersion === undefined) {
    const versions = await getCurrentVersions(input.acceptedAt);
    const effective = versions[input.docType].effective;
    if (!effective) throw new Error(`No effective ${input.docType} document to accept`);
    documentId = effective.id;
    documentVersion = effective.version;
  }

  try {
    await db.legalAcceptance.create({
      data: {
        logtoUserId: input.logtoUserId,
        docType: input.docType,
        documentId,
        documentVersion,
        context: input.context,
        ip: input.ip,
        userAgent: input.userAgent,
        acceptedAt: input.acceptedAt ?? new Date(),
      },
    });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return false; // already recorded — idempotent
    }
    throw e;
  }
}

/** Latest accepted version per doc type for a user (null if never accepted). */
export async function getUserAcceptanceState(
  logtoUserId: string,
): Promise<Record<LegalDocType, number | null>> {
  const rows = await db.legalAcceptance.groupBy({
    by: ["docType"],
    where: { logtoUserId },
    _max: { documentVersion: true },
  });
  const state = { PRIVACY: null, TERMS: null } as Record<LegalDocType, number | null>;
  for (const r of rows) state[r.docType] = r._max.documentVersion ?? null;
  return state;
}

export type GateDecision = {
  mustAccept: LegalDocType[]; // effective version unaccepted -> block the app
  announced: LegalDocType[]; // upcoming version unaccepted -> show a banner
};

/**
 * The single call the in-app gate (Logto track) makes on each authed request:
 * which docs block the user now, and which have an upcoming change to tease.
 */
export async function getGateState(
  logtoUserId: string,
  now: Date = new Date(),
): Promise<GateDecision> {
  const [versions, accepted] = await Promise.all([
    getCurrentVersions(now),
    getUserAcceptanceState(logtoUserId),
  ]);

  const mustAccept: LegalDocType[] = [];
  const announced: LegalDocType[] = [];
  for (const type of Object.values(LegalDocType)) {
    const st = versions[type];
    const acc = accepted[type];
    if (st.effective && (acc === null || acc < st.effective.version)) mustAccept.push(type);
    if (st.announced && (acc === null || acc < st.announced.version)) announced.push(type);
  }
  return { mustAccept, announced };
}
