import { requireLogtoUser } from "@/lib/auth/session";
import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { db } from "@/lib/billing/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/lr/quantum/jobs
 *
 * Lists the caller's own submitted jobs — browser session or API key (see
 * resolveCustomer.ts), so this surfaces jobs submitted in-app and via the
 * SDK/Colab notebook identically, since both write to the same
 * QuantumJobSubmission rows keyed by the same resolved customer.
 *
 * Returns cached status/shots from the DB, not a live iqm-proxy fetch per
 * row — the client re-polls live status per-job for anything not yet in a
 * terminal state, the same way the single-job detail view already does.
 */
export async function GET(req: Request) {
  const customer = await resolveCustomerFromRequest(req);
  if (!customer) {
    // resolveCustomerFromRequest returns null both for "not signed in" and
    // for "signed in, but hasn't submitted a job yet so has no Customer row"
    // (that row is only lazily created on submit). A brand-new signed-in
    // user simply has zero jobs — only a truly unauthenticated caller (no
    // session, no API key) should get a 401 here.
    const signedIn = await requireLogtoUser().then(
      () => true,
      () => false,
    );
    if (signedIn) return NextResponse.json({ jobs: [] });

    return NextResponse.json(
      { error: "Not signed in, and no valid API key provided." },
      { status: 401 },
    );
  }

  const jobs = await db.quantumJobSubmission.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: {
      jobId: true,
      backend: true,
      shots: true,
      status: true,
      createdAt: true,
      finishedAt: true,
    },
  });

  return NextResponse.json({ jobs });
}
