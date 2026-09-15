import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { creditsToCents, transferCredits } from "@/lib/billing/transferCredits";
import { NextResponse } from "next/server";

/**
 * POST /api/billing/credits/transfer
 *
 * Sends whole credits from the signed-in customer to another user, looked up
 * by email. Validation and the transfer itself are one endpoint and one
 * transaction — there is no "check first, then send" two-call flow to get out
 * of sync.
 *
 * Body: { email: string, credits: number }  // credits, not cents
 *
 * Responses follow the same shape the rest of /api/lr and /api/billing use —
 * `{ error: "<snake_case_code>", message: "<human text>" }` with a matching
 * status, so existing client helpers that read `data.error` keep working:
 *   200 { ok: true, transferId, amountCents, senderBalanceCents, recipientEmail }
 *   402 { error: "insufficient_balance", message, balanceCents }
 *   404 { error: "recipient_not_found", message, email }
 *   400 { error: "error", message }            — bad amount, self-transfer
 *   401 { error: "Not signed in." }
 *   500 { error: "error", message }            — unexpected failure, nothing moved
 *
 * Session-only (no API-key path): sharing credits is an account-holder action,
 * deliberately not something an SDK key can do on a customer's behalf.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { email?: unknown; credits?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "error", message: "Invalid request body." },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email : "";
  const credits = Number(body.credits);

  if (!Number.isInteger(credits) || credits <= 0) {
    return NextResponse.json(
      {
        error: "error",
        message: "Enter a whole number of credits greater than zero.",
      },
      { status: 400 },
    );
  }

  const sender = await getOrCreateCustomer(user.sub, user.email);
  const result = await transferCredits(sender, email, creditsToCents(credits));

  switch (result.status) {
    case "ok":
      return NextResponse.json({
        ok: true,
        transferId: result.transferId,
        amountCents: result.amountCents,
        senderBalanceCents: result.senderBalanceCents,
        recipientEmail: result.recipientEmail,
      });

    case "insufficient_balance":
      return NextResponse.json(
        {
          error: "insufficient_balance",
          message: result.message,
          balanceCents: result.balanceCents,
        },
        { status: 402 },
      );

    case "recipient_not_found":
      // Distinct from a generic error on purpose: the UI turns this into the
      // "invite them instead" affordance rather than a failure message.
      return NextResponse.json(
        {
          error: "recipient_not_found",
          message: result.message,
          email: result.email,
        },
        { status: 404 },
      );

    case "error":
      // Caller-fixable problems (bad amount, sending to yourself) are 400;
      // anything else is ours.
      return NextResponse.json(
        { error: "error", message: result.message },
        { status: result.cause === "caller" ? 400 : 500 },
      );
  }
}
