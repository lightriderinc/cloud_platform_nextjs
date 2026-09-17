import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { db } from "@/lib/billing/db";
import { REFERRAL_REWARD_PREFIX } from "@/lib/billing/referrals";
import {
  TRANSFER_RECEIVED_PREFIX,
  TRANSFER_SENT_PREFIX,
} from "@/lib/billing/transferCredits";
import { NextResponse } from "next/server";

/**
 * GET /api/billing/credits/transfers?view=sent|received&page=1
 *
 * The caller's own transfer history. Rows are read purely from the ledger's
 * transfer columns plus `counterpartyEmailSnapshot`, so rendering history
 * never makes a live Logto call and is unaffected by a counterparty later
 * changing their email.
 *
 * Direction comes from the `reason` prefix rather than the sign of
 * amountCents: the sign alone cannot distinguish a transfer debit from a job
 * spend, and this table is likely to be reused for other ledger views.
 */
const PAGE_SIZE = 10;

export async function GET(req: Request) {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = new URL(req.url);
  const view = url.searchParams.get("view") === "received" ? "received" : "sent";
  const pageParam = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const customer = await getOrCreateCustomer(user.sub, user.email);

  // "Received" covers every inbound credit movement that isn't a purchase:
  // transfers from other users AND referral rewards. Referral rewards are
  // deliberately NOT filtered out here — that exclusion exists only in
  // purchase-eligibility logic (planCheck/purchases), which is about how
  // credits were obtained, not about what a customer is allowed to see.
  // Hiding a grant someone actually received would make their balance
  // unexplainable from their own history.
  const where =
    view === "received"
      ? {
          customerId: customer.id,
          OR: [
            { reason: { startsWith: TRANSFER_RECEIVED_PREFIX } },
            { reason: { startsWith: REFERRAL_REWARD_PREFIX } },
          ],
        }
      : {
          customerId: customer.id,
          transferId: { not: null },
          reason: { startsWith: TRANSFER_SENT_PREFIX },
        };

  // One extra row rather than a second count() query: all the page needs to
  // know is whether a "next" button belongs on screen.
  const entries = await db.creditLedgerEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  const hasMore = entries.length > PAGE_SIZE;

  return NextResponse.json({
    view,
    page,
    pageSize: PAGE_SIZE,
    hasMore,
    transfers: entries.slice(0, PAGE_SIZE).map((entry) => ({
      id: entry.id,
      transferId: entry.transferId,
      batchId: entry.batchId,
      // Always positive: direction is carried by `view`, not by the sign.
      amountCents: Math.abs(entry.amountCents),
      counterpartyEmail: entry.counterpartyEmailSnapshot,
      // Surfaced so this table can tell a transfer apart from other ledger
      // activity if it is ever reused for a combined view.
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}
