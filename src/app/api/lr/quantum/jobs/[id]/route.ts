import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { db } from "@/lib/billing/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/lr/quantum/jobs/:id
 *
 * No plan check — reading your own job is free. Accepts either a Logto
 * session or a bearer API key (see resolveCustomer.ts). Ownership is
 * enforced against QuantumJobSubmission (see submit/route.ts) since
 * iqm-proxy itself only sees our one shared QUANTUM_PROXY_SERVICE_KEY and
 * can't tell our customers apart. 404 (not 403) for a job that exists but
 * isn't yours, so a guess doesn't confirm the job's existence.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const customer = await resolveCustomerFromRequest(request);
  if (!customer) {
    return NextResponse.json(
      { error: "Not signed in, and no valid API key provided." },
      { status: 401 },
    );
  }

  const { id } = await params;

  const submission = await db.quantumJobSubmission.findUnique({ where: { jobId: id } });
  if (!submission || submission.customerId !== customer.id) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const proxyRes = await fetch(
    `${process.env.QUANTUM_PROXY_URL}/jobs/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}` } },
  ).catch((err) => {
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

  // Opportunistically refresh the cached status so the /jobs list can show
  // something better than a stale "PENDING" without live-polling every row
  // on every page load. Best-effort — a failed cache write shouldn't fail a
  // request that already has the real, live answer to return.
  if (typeof data.status === "string" && data.status !== submission.status) {
    db.quantumJobSubmission
      .update({ where: { jobId: id }, data: { status: data.status } })
      .catch(() => {});
  }

  return NextResponse.json(data);
}
