import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { hasEnoughCredits, hasPurchasedCredits } from "@/lib/billing/planCheck";
import { db } from "@/lib/billing/db";
import { isValidBackend, QUANTUM_BACKENDS } from "@/lib/quantum/backends";
import { NextResponse } from "next/server";

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
  const { backend, circuit, shots } = body;

  if (!backend || !isValidBackend(backend)) {
    return NextResponse.json(
      {
        error: `Unknown backend '${backend}'. Valid options: ${Object.keys(QUANTUM_BACKENDS).join(", ")}`,
      },
      { status: 400 },
    );
  }

  const config = QUANTUM_BACKENDS[backend];
  // Ceil to the nearest whole credit: costPerShotCents can be fractional
  // (e.g. 0.2), but costCents/amountCents are Int columns in the DB.
  const costCents = Math.ceil((shots ?? 1) * config.costPerShotCents);

  // Real QPU access (any backend that actually costs credits) requires
  // having purchased credits at least once — the free signup grant alone
  // doesn't unlock it, even if it'd otherwise cover this job's cost. Mock/
  // sample-circuit backends (costPerShotCents: 0) are unaffected.
  if (config.costPerShotCents > 0 && !(await hasPurchasedCredits(customer.id))) {
    return NextResponse.json(
      {
        error: "purchase_required",
        message:
          "Real QPU access requires purchasing credits first. Visit /settings/purchases/quantum-compute to buy credits.",
      },
      { status: 402 },
    );
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

  if (!proxyRes || !proxyRes.ok) {
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
          reason: `quantum_job:${backend}`,
        },
      }),
    );
  }

  if (ops.length > 0) {
    await db.$transaction(ops);
  }

  return NextResponse.json(data);
}
