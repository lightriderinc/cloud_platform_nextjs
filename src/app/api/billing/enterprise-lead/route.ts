import { logtoConfig } from "@/app/logto";
import { db } from "@/lib/billing/db";
import { getLogtoContext } from "@logto/next/server-actions";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/billing/enterprise-lead
 *
 * Enterprise & Government deals are never self-serve checkout (per Tony's
 * routing: invoice/ACH for commercial, direct contract only for government).
 * This just records the request; it does NOT create anything in Stripe.
 *
 * TODO(sales-ops): decide how this should actually notify the sales team —
 * e.g. forward to a CRM, Slack webhook, or shared inbox. Left as a stored
 * row + console log until that's decided, rather than guessing a tool.
 */
export async function POST(request: NextRequest) {
  const { claims } = await getLogtoContext(logtoConfig).catch(() => ({
    claims: undefined,
  }));

  const body = await request.json().catch(() => null);
  const email = (body?.email as string | undefined) ?? (claims?.email as string | undefined);

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const lead = await db.enterpriseLead.create({
    data: {
      logtoUserId: claims?.sub,
      email,
      company: body?.company,
      useCase: body?.useCase,
      deploymentType: body?.deploymentType,
      message: body?.message,
    },
  });

  console.log(`[enterprise-lead] new submission ${lead.id} from ${email}`);

  return NextResponse.json({ ok: true });
}
