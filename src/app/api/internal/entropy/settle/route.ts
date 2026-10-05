import { NextResponse } from "next/server";
import { settleEntropyDraw } from "@/lib/billing/entropyCharges";
import { readJson, withEntropyCustomer } from "@/lib/billing/entropyInternal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/internal/entropy/settle  (entropy platform server only)
 * Body: { drawId: uuid, egressRequestId: string }
 * Marks a charged draw as delivered. Idempotent.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  return withEntropyCustomer(request, { create: false }, async (customer) => {
    const r = await settleEntropyDraw(customer, String(body.drawId ?? ""), String(body.egressRequestId ?? ""));
    if (r.status === "settled") return NextResponse.json(r);
    if (r.status === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ error: "already_refunded" }, { status: 409 });
  });
}
