import { NextResponse } from "next/server";
import { sweepStaleEntropyCharges } from "@/lib/billing/entropyCharges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/entropy-sweep - Vercel Cron (see vercel.json).
 *
 * Refunds entropy draws left `charged` (never settled or refunded) for over
 * ten minutes - the entropy server died between charging and finishing. Vercel
 * sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const refunded = await sweepStaleEntropyCharges();
  return NextResponse.json({ refunded });
}
