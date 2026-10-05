import { NextResponse } from "next/server";
import { sweepStaleEntropyCharges } from "@/lib/billing/entropyCharges";
import { withEntropyCustomer } from "@/lib/billing/entropyInternal";
import { getWalletPage } from "@/lib/billing/entropyWallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/internal/entropy/wallet?cursor=<ledgerEntryId>  (entropy platform server only)
 *
 * The user's shared Light Rider wallet: balance (cents = credits = entropy
 * tokens), whether purchased credits have unlocked it (signup credits alone
 * don't pay for entropy - planCheck.hasUnlockedCredits), and one page of the
 * credit ledger newest-first - every entry, not just entropy ones, since it
 * is one wallet across platforms. Entropy rows carry their mode and bytes.
 *
 * Also refunds this user's own abandoned charges first, so a draw that died
 * mid-flow shows as refunded the next time they look.
 */
export async function GET(request: Request) {
  return withEntropyCustomer(request, { create: true }, async (customer) => {
    await sweepStaleEntropyCharges(customer.id);
    const cursor = new URL(request.url).searchParams.get("cursor");
    return NextResponse.json(await getWalletPage(customer.id, cursor));
  });
}
