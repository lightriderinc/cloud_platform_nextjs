import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import {
  creditsToCents,
  transferCreditsBatch,
  type BatchRowInput,
} from "@/lib/billing/transferCredits";
import { NextResponse } from "next/server";

/**
 * POST /api/billing/credits/transfer
 *
 * Sends whole credits from the signed-in customer to one or more recipients,
 * looked up by email. Validation and the transfer are one endpoint and one
 * transaction — there is no "check first, then send" flow to get out of sync.
 *
 * Body: {
 *   rows: [{ email: string, credits: number }],  // credits, not cents
 *   idempotencyKey: string                       // client-generated, per submit
 * }
 *
 * A single recipient is just a one-row batch; there is no separate endpoint
 * or code path for it.
 *
 * Responses follow the same shape the rest of /api/lr and /api/billing use —
 * `{ error: "<snake_case_code>", message: "<human text>" }` with a matching
 * status, so existing client helpers that read `data.error` keep working:
 *   200 { ok: true, batchId, rows[], totalSentCents, senderBalanceCents, replayed }
 *   402 { error: "insufficient_balance", message, balanceCents, requestedCents, rows[] }
 *   422 { error: "no_valid_rows", message, rows[] }
 *   400 { error: "too_many_rows" | "error", message }
 *   401 { error: "Not signed in." }
 *   500 { error: "error", message }            — unexpected failure, nothing moved
 *
 * Per-row outcomes live in `rows[]`, so one bad address never collapses into a
 * single generic error for the whole batch.
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

  let body: { rows?: unknown; idempotencyKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "error", message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.rows)) {
    return NextResponse.json(
      { error: "error", message: "Expected a list of recipients." },
      { status: 400 },
    );
  }

  const idempotencyKey =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "error", message: "Missing idempotency key." },
      { status: 400 },
    );
  }

  // Credits -> cents at the boundary, exactly once. Non-numeric input is
  // passed through as NaN rather than rejected here, so the per-row validator
  // reports it against the row the user can actually see and fix.
  const rows: BatchRowInput[] = body.rows.map((raw) => {
    const row = (raw ?? {}) as { email?: unknown; credits?: unknown };
    return {
      email: typeof row.email === "string" ? row.email : "",
      amountCents: creditsToCents(Number(row.credits)),
    };
  });

  const sender = await getOrCreateCustomer(user.sub, user.email);
  const result = await transferCreditsBatch(sender, rows, idempotencyKey);

  switch (result.status) {
    case "ok":
      return NextResponse.json({
        ok: true,
        batchId: result.batchId,
        rows: result.rows,
        totalSentCents: result.totalSentCents,
        senderBalanceCents: result.senderBalanceCents,
        replayed: result.replayed,
      });

    case "insufficient_balance":
      return NextResponse.json(
        {
          error: "insufficient_balance",
          message: result.message,
          balanceCents: result.balanceCents,
          requestedCents: result.requestedCents,
          rows: result.rows,
        },
        { status: 402 },
      );

    case "too_many_rows":
      return NextResponse.json(
        { error: "too_many_rows", message: result.message },
        { status: 400 },
      );

    case "no_valid_rows":
      // Not a server failure and not a generic error: every row has its own
      // reason in `rows`, which is what the UI renders.
      return NextResponse.json(
        { error: "no_valid_rows", message: result.message, rows: result.rows },
        { status: 422 },
      );

    case "error":
      // Caller-fixable problems are 400; anything else is ours.
      return NextResponse.json(
        {
          error: "error",
          message: result.message,
          // Upstream cause, for preview/local debugging only — never sent to
          // real users, since it names internal services and status codes.
          ...(result.detail && process.env.VERCEL_ENV !== "production"
            ? { detail: result.detail }
            : {}),
        },
        { status: result.cause === "caller" ? 400 : 500 },
      );
  }
}
