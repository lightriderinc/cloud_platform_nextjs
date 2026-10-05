import { db } from "@/lib/billing/db";
import { ENTROPY_DRAW_PREFIX, ENTROPY_REFUND_PREFIX } from "@/lib/billing/ledgerReasons";
import { hasUnlockedCredits } from "@/lib/billing/planCheck";

export const WALLET_PAGE_SIZE = 50;

/** What an entropy row was for, so history can say e.g. "single source, 256 B". */
export type EntropyEntryDetail = { mode: string; bytes: number | null };

export type WalletEntry = {
  id: string;
  amountCents: number;
  reason: string;
  counterpartyEmail: string | null;
  createdAt: string;
  /** Set on entropy draw/refund rows; bytes is null on rows that predate the link. */
  entropy: EntropyEntryDetail | null;
};

export type WalletPage = {
  balanceCents: number;
  unlocked: boolean;
  entries: WalletEntry[];
  nextCursor: string | null;
};

function entropyDetail(
  reason: string,
  charge: { mode: string; bytes: number } | null,
): EntropyEntryDetail | null {
  if (charge) return { mode: charge.mode, bytes: charge.bytes };
  for (const prefix of [ENTROPY_DRAW_PREFIX, ENTROPY_REFUND_PREFIX]) {
    if (reason.startsWith(prefix)) return { mode: reason.slice(prefix.length), bytes: null };
  }
  return null;
}

/**
 * One page of the customer's whole credit ledger, newest first - every row
 * (cloud and entropy alike; it is one wallet), nothing filtered out. Cursor
 * is the last row id of the previous page.
 */
export async function getWalletPage(customerId: string, cursor?: string | null): Promise<WalletPage> {
  const [fresh, unlocked, rows] = await Promise.all([
    db.customer.findUnique({ where: { id: customerId }, select: { creditsBalanceCents: true } }),
    hasUnlockedCredits(customerId),
    db.creditLedgerEntry.findMany({
      where: { customerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: WALLET_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        amountCents: true,
        reason: true,
        createdAt: true,
        counterpartyEmailSnapshot: true,
        entropyCharge: { select: { mode: true, bytes: true } },
      },
    }),
  ]);
  const page = rows.slice(0, WALLET_PAGE_SIZE);
  return {
    balanceCents: fresh?.creditsBalanceCents ?? 0,
    unlocked,
    entries: page.map((e) => ({
      id: e.id,
      amountCents: e.amountCents,
      reason: e.reason,
      counterpartyEmail: e.counterpartyEmailSnapshot,
      createdAt: e.createdAt.toISOString(),
      entropy: entropyDetail(e.reason, e.entropyCharge),
    })),
    nextCursor: rows.length > WALLET_PAGE_SIZE ? page[page.length - 1].id : null,
  };
}
