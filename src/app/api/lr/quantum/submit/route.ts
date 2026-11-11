import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { QUANTUM_JOB_PREFIX, QUANTUM_JOB_REFUND_PREFIX } from "@/lib/billing/ledgerReasons";
import { hasEnoughCredits, hasUnlockedCredits } from "@/lib/billing/planCheck";
import { db } from "@/lib/billing/db";
import { grantReferralRewardIfEligible } from "@/lib/billing/referrals";
import { IonqQuoteError, quoteIonqJob } from "@/lib/quantum/ionqPricing";
import { isPricedPerJob, isValidBackend, QUANTUM_BACKENDS, type QuantumBackendId } from "@/lib/quantum/backends";
import type { Customer } from "@prisma/client";
import { NextResponse } from "next/server";

const PURCHASE_REQUIRED = {
  error: "purchase_required",
  message:
    "Real QPU access requires purchasing credits first. Visit /settings/manage-credits/purchase to buy credits.",
} as const;

/**
 * POST /api/lr/quantum/submit
 *
 * Job submission to iqm-proxy. V2 product model: purely credit-balance
 * gated, no Pro subscription check anywhere in this path (Pro
 * infrastructure — isProCustomer(), the Stripe subscription flow,
 * resync-pro-role — stays in the codebase, just unreachable from here).
 * Mock backends cost 0 (see backends.ts), so hasEnoughCredits() is a
 * natural no-op for them. Accepts either a Logto browser session
 * (DemoCircuitModal, NewJobModal — in-app, same-origin calls) or an
 * `Authorization: Bearer lr_...` API key (external SDK/Colab callers) —
 * see resolveCustomer.ts. createIfMissing: true because this is commonly a
 * signed-in user's very first relevant request — that's also where their
 * free signup credit grant happens (see getOrCreateCustomer).
 */
export async function POST(req: Request) {
  // Captured before the proxy call (not read via Prisma's createdAt
  // @default(now()) at insert time, which happens after awaiting it) — a
  // synchronous backend (Rigetti mock, IQM mock) can fully finish before that
  // insert ever runs, which made our own createdAt structurally always land
  // after the proxy's own finishedAt, so every runtime calculation that pairs
  // this row's createdAt with the proxy's finishedAt came out negative.
  const submitStartedAt = new Date();

  const customer = await resolveCustomerFromRequest(req, { createIfMissing: true });
  if (!customer) {
    return NextResponse.json(
      { error: "Not signed in, and no valid API key provided." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { backend, circuit, shots, confirmedPriceCredits } = body;

  if (!backend || !isValidBackend(backend)) {
    return NextResponse.json(
      {
        error: `Unknown backend '${backend}'. Valid options: ${Object.keys(QUANTUM_BACKENDS).join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (isPricedPerJob(backend)) {
    return submitPricedPerJob(customer, backend, circuit, shots ?? 1, confirmedPriceCredits, submitStartedAt);
  }

  const config = QUANTUM_BACKENDS[backend];
  // Ceil to the nearest whole credit: costPerShotCents can be fractional
  // (e.g. 0.2), but costCents/amountCents are Int columns in the DB.
  const costCents = Math.ceil((shots ?? 1) * config.costPerShotCents);

  // Real QPU access (any backend that actually costs credits) requires
  // having purchased credits at least once — the free signup grant alone
  // doesn't unlock it, even if it'd otherwise cover this job's cost. Mock/
  // sample-circuit backends (costPerShotCents: 0) are unaffected.
  if (config.costPerShotCents > 0 && !(await hasUnlockedCredits(customer.id))) {
    return NextResponse.json(PURCHASE_REQUIRED, { status: 402 });
  }

  if (costCents > 0 && !hasEnoughCredits(customer, costCents)) {
    return NextResponse.json(
      {
        error: "insufficient_credits",
        message: `This job costs $${(costCents / 100).toFixed(2)}, but your account has $${(customer.creditsBalanceCents / 100).toFixed(2)} remaining.`,
      },
      { status: 402 },
    );
  }

  const proxyRes = await fetch(`${process.env.QUANTUM_PROXY_URL}${config.proxyPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}`,
    },
    // device_instance tells iqm-proxy's per-request device registry which
    // QPU alias to route to (see backends.ts) — auth is unchanged, same
    // QUANTUM_PROXY_SERVICE_KEY bearer token as before, just an added body
    // field.
    body: JSON.stringify({ circuit, shots, device_instance: config.deviceInstance }),
  }).catch((err) => {
    console.error("iqm-proxy unreachable:", err);
    return null;
  });

  if (!proxyRes) {
    return NextResponse.json(
      { error: "Job submission service is currently unreachable. Try again later." },
      { status: 502 },
    );
  }

  if (!proxyRes.ok) {
    // Rigetti's availability gating: qpu-proxy rejects a submission outright
    // (503) when the device has no capacity, rather than queuing it. As of
    // 2026-08-12 the body is a free-text `detail` string, e.g.
    // 'no capacity available (next_available_at=2026-08-12T18:00:00Z)' — not
    // a structured field. Parsed defensively; ask qpu-proxy to switch to
    // {"status":"busy","next_available_at":"..."} instead of expanding this
    // regex further if the wording changes.
    if (proxyRes.status === 503) {
      const errBody: Record<string, unknown> = await proxyRes.json().catch(() => ({}));
      const detail = typeof errBody.detail === "string" ? errBody.detail : "";
      const match = detail.match(/next_available_at=([^)]+)\)/);
      if (match) {
        return NextResponse.json({ error: "busy", nextAvailableAt: match[1] }, { status: 503 });
      }
    }
    return NextResponse.json(
      { error: "Job submission service is currently unreachable. Try again later." },
      { status: 502 },
    );
  }

  const data = await proxyRes.json();

  // iqm-proxy only sees our one shared QUANTUM_PROXY_SERVICE_KEY, so it can't
  // enforce per-customer ownership itself — this local record is what lets
  // GET /jobs/[id] (and /result) verify the caller actually owns this job.
  const jobId = data.job_uuid ?? data.uuid ?? data.id;

  const ops = [];
  if (jobId) {
    ops.push(
      db.quantumJobSubmission.create({
        data: {
          customerId: customer.id,
          jobId: String(jobId),
          backend,
          shots: shots ?? 1,
          status: typeof data.status === "string" ? data.status : "PENDING",
          costCents,
          createdAt: submitStartedAt,
        },
      }),
    );
  } else {
    console.error("iqm-proxy submit response had no recognizable job id:", data);
  }

  if (costCents > 0) {
    ops.push(
      db.customer.update({
        where: { id: customer.id },
        data: { creditsBalanceCents: { decrement: costCents } },
      }),
      db.creditLedgerEntry.create({
        data: {
          customerId: customer.id,
          amountCents: -costCents,
          reason: `${QUANTUM_JOB_PREFIX}${backend}`,
        },
      }),
    );
  }

  if (ops.length > 0) {
    await db.$transaction(ops);
  }

  // Qualifying event (a) for Refer & Earn: a real-hardware job that actually
  // debited. Placed AFTER the transaction resolved, so a proxy failure, a
  // rejected submission or a rolled-back debit can never pay a reward.
  // costCents > 0 is what makes this real hardware — every mock backend is
  // costPerShotCents: 0 (see backends.ts).
  //
  // Deliberately not awaited: the reward is a bonus and must never delay or
  // fail a job that already succeeded. grantReferralRewardIfEligible swallows
  // and logs its own errors; the .catch is belt-and-braces against an
  // unhandled rejection taking down the process.
  if (costCents > 0) {
    void grantReferralRewardIfEligible(customer.id, "first_qpu_job").catch(
      (err) => console.error("[referral] unexpected reward failure:", err),
    );
  }

  return NextResponse.json(data);
}

/**
 * Per-job priced backends (IonQ Forte). The order is what the user agreed
 * to: they saw a quoted price and confirmed it, the credits come off, then
 * the job is sent.
 *
 *   1. Re-quote server-side (POST /jobs/estimate). The client's figure is
 *      only an upper bound the user agreed to: a higher price is refused
 *      (409 price_changed) so they can review it; a missing confirmation is
 *      refused too (409 price_confirmation_required, with the price), so an
 *      API caller can't run an expensive job without having seen its price.
 *   2. Debit with a compare-and-set (balance >= price in one statement, the
 *      same guard as transferCredits.ts), so concurrent submits can't
 *      overdraw.
 *   3. Send the job. If qpu-proxy refuses it (e.g. Forte went into
 *      maintenance after the quote) or is unreachable, the charge is
 *      refunded at once, under QUANTUM_JOB_REFUND_PREFIX. A job that was
 *      sent is never adjusted afterwards, whatever its outcome.
 */
async function submitPricedPerJob(
  customer: Customer,
  backend: QuantumBackendId,
  circuit: unknown,
  shots: number,
  confirmedPriceCredits: unknown,
  submitStartedAt: Date,
) {
  const config = QUANTUM_BACKENDS[backend];

  if (!(await hasUnlockedCredits(customer.id))) {
    return NextResponse.json(PURCHASE_REQUIRED, { status: 402 });
  }

  let priceCredits: number;
  try {
    ({ priceCredits } = await quoteIonqJob(config.deviceInstance, circuit, shots));
  } catch (err) {
    if (err instanceof IonqQuoteError) {
      return NextResponse.json({ error: "estimate_failed", message: err.message }, { status: err.status });
    }
    throw err;
  }

  if (typeof confirmedPriceCredits !== "number" || !Number.isFinite(confirmedPriceCredits)) {
    return NextResponse.json(
      {
        error: "price_confirmation_required",
        priceCredits,
        message: `This backend is priced per job. This job costs ${priceCredits} credits; resubmit with confirmedPriceCredits: ${priceCredits} to run it.`,
      },
      { status: 409 },
    );
  }
  if (priceCredits > confirmedPriceCredits) {
    return NextResponse.json(
      {
        error: "price_changed",
        priceCredits,
        message: `The price for this job is now ${priceCredits} credits. Review the new price and confirm again.`,
      },
      { status: 409 },
    );
  }

  const debited = await db.$transaction(async (tx) => {
    const result = await tx.customer.updateMany({
      where: { id: customer.id, creditsBalanceCents: { gte: priceCredits } },
      data: { creditsBalanceCents: { decrement: priceCredits } },
    });
    if (result.count === 0) return false;
    await tx.creditLedgerEntry.create({
      data: { customerId: customer.id, amountCents: -priceCredits, reason: `${QUANTUM_JOB_PREFIX}${backend}` },
    });
    return true;
  });
  if (!debited) {
    return NextResponse.json(
      {
        error: "insufficient_credits",
        message: `This job costs ${priceCredits} credits, but your balance is ${customer.creditsBalanceCents} credits.`,
      },
      { status: 402 },
    );
  }

  const proxyRes = await fetch(`${process.env.QUANTUM_PROXY_URL}${config.proxyPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}`,
    },
    body: JSON.stringify({ circuit, shots, device_instance: config.deviceInstance }),
  }).catch((err) => {
    console.error("qpu-proxy unreachable:", err);
    return null;
  });

  if (!proxyRes || !proxyRes.ok) {
    const unavailable = proxyRes?.status === 503;
    if (proxyRes) {
      const errBody: Record<string, unknown> = await proxyRes.json().catch(() => ({}));
      console.error(`[ionq] qpu-proxy refused ${backend} job (HTTP ${proxyRes.status}):`, errBody.detail ?? errBody);
    }
    const refunded = await refundPerJobCharge(customer.id, backend, priceCredits);
    const what = unavailable
      ? "This IonQ system is unavailable right now, for example during maintenance."
      : "Job submission service is currently unreachable.";
    const charge = refunded
      ? "Your credits were returned."
      : "Your credits will be returned; contact support if they don't appear.";
    return NextResponse.json(
      { error: unavailable ? "unavailable" : "submission_failed", message: `${what} ${charge}` },
      { status: unavailable ? 503 : 502 },
    );
  }

  const data = await proxyRes.json();
  const jobId = data.job_uuid ?? data.uuid ?? data.id;
  if (jobId) {
    await db.quantumJobSubmission.create({
      data: {
        customerId: customer.id,
        jobId: String(jobId),
        backend,
        shots,
        status: typeof data.status === "string" ? data.status : "PENDING",
        costCents: priceCredits,
        createdAt: submitStartedAt,
      },
    });
  } else {
    console.error("qpu-proxy submit response had no recognizable job id:", data);
  }

  // Same Refer & Earn qualifying event as a per-shot real-hardware job.
  void grantReferralRewardIfEligible(customer.id, "first_qpu_job").catch((err) =>
    console.error("[referral] unexpected reward failure:", err),
  );

  return NextResponse.json({ ...data, priceCredits });
}

/** Returns a per-job charge for a job qpu-proxy never accepted. False if the refund itself failed (logged for manual follow-up). */
async function refundPerJobCharge(customerId: string, backend: QuantumBackendId, priceCredits: number): Promise<boolean> {
  try {
    await db.$transaction([
      db.customer.update({
        where: { id: customerId },
        data: { creditsBalanceCents: { increment: priceCredits } },
      }),
      db.creditLedgerEntry.create({
        data: { customerId, amountCents: priceCredits, reason: `${QUANTUM_JOB_REFUND_PREFIX}${backend}` },
      }),
    ]);
    return true;
  } catch (err) {
    console.error(
      `[ionq] REFUND FAILED: customer ${customerId} was charged ${priceCredits} credits for a ${backend} job that was never sent:`,
      err,
    );
    return false;
  }
}
