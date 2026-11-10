import { db } from "@/lib/billing/db";
import { LegalNotificationChannel } from "@prisma/client";
import { LEGAL_NOTICE_WINDOW_DAYS } from "./types";

export type PendingEmail = {
  logtoUserId: string;
  email: string;
  documentId: string;
  docType: string;
  version: number;
  effectiveAt: Date;
  summary: string | null;
};

/**
 * Users who should get a "policy changing soon" email now: for every document
 * whose effectiveAt is within the notice window (published, not yet effective),
 * the known customers who have neither accepted that version nor already been
 * emailed about it. Recipient email comes from the Customer table (see the
 * "Known limitation" note in the guide).
 */
export async function getUsersPendingEmail(now: Date = new Date()): Promise<PendingEmail[]> {
  const windowEnd = new Date(now.getTime() + LEGAL_NOTICE_WINDOW_DAYS * 86_400_000);

  const upcoming = await db.legalDocument.findMany({
    where: { effectiveAt: { gt: now, lte: windowEnd } },
  });
  if (upcoming.length === 0) return [];

  const customers = await db.customer.findMany({
    where: { email: { not: null } },
    select: { logtoUserId: true, email: true },
  });

  const pending: PendingEmail[] = [];
  for (const doc of upcoming) {
    const [notified, accepted] = await Promise.all([
      db.legalNotification.findMany({
        where: { documentId: doc.id, channel: "EMAIL" },
        select: { logtoUserId: true },
      }),
      db.legalAcceptance.findMany({
        where: { documentId: doc.id },
        select: { logtoUserId: true },
      }),
    ]);
    const skip = new Set([...notified, ...accepted].map((r) => r.logtoUserId));

    for (const c of customers) {
      if (!c.email || skip.has(c.logtoUserId)) continue;
      pending.push({
        logtoUserId: c.logtoUserId,
        email: c.email,
        documentId: doc.id,
        docType: doc.docType,
        version: doc.version,
        effectiveAt: doc.effectiveAt,
        summary: doc.summary,
      });
    }
  }
  return pending;
}

/** Records that a notice was sent, so it isn't sent again. Idempotent. */
export async function markNotified(
  logtoUserId: string,
  documentId: string,
  channel: LegalNotificationChannel = "EMAIL",
): Promise<void> {
  await db.legalNotification.upsert({
    where: { logtoUserId_documentId_channel: { logtoUserId, documentId, channel } },
    create: { logtoUserId, documentId, channel },
    update: {},
  });
}
