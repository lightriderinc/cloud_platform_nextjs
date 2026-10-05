import { NextResponse } from "next/server";
import { db } from "@/lib/billing/db";
import { sweepStaleEntropyCharges } from "@/lib/billing/entropyCharges";
import { withEntropyCustomer } from "@/lib/billing/entropyInternal";
import { hasUnlockedCredits } from "@/lib/billing/planCheck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 50;

/**
 * GET /api/internal/entropy/wallet?cursor=<ledgerEntryId>  (entropy platform server only)
 *
 * The user's shared Light Rider wallet: balance (cents = credits = entropy
 * tokens), whether purchased credits have unlocked it (signup credits alone
 * don't pay for entropy - planCheck.hasUnlockedCredits), and one page of the
 * credit ledger newest-first - every entry, not just entropy ones, since it
 * is one wallet across platforms.
 *
 * Also refunds this user's own abandoned charges first, so a draw that died
 * mid-flow shows as refunded the next time they look.
 */
export async function GET(request: Request) {
  return withEntropyCustomer(request, { create: true }, async (customer) => {
    await sweepStaleEntropyCharges(customer.id);
    const cursor = new URL(request.url).searchParams.get("cursor");

    const [fresh, unlocked, entries] = await Promise.all([
      db.customer.findUnique({ where: { id: customer.id }, select: { creditsBalanceCents: true } }),
      hasUnlockedCredits(customer.id),
      db.creditLedgerEntry.findMany({
        where: { customerId: customer.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: PAGE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, amountCents: true, reason: true, createdAt: true, counterpartyEmailSnapshot: true },
      }),
    ]);

    const page = entries.slice(0, PAGE);
    return NextResponse.json({
      balanceCents: fresh?.creditsBalanceCents ?? 0,
      unlocked,
      entries: page.map((e) => ({
        id: e.id,
        amountCents: e.amountCents,
        reason: e.reason,
        counterpartyEmail: e.counterpartyEmailSnapshot,
        createdAt: e.createdAt.toISOString(),
      })),
      nextCursor: entries.length > PAGE ? page[page.length - 1].id : null,
    });
  });
}
