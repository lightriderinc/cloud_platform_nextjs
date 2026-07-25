import { resolveApiKey } from "@/lib/auth/apiKeys";
import { db } from "@/lib/billing/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/lr/quantum/jobs/:id/result
 *
 * Same ownership enforcement as the sibling status route — see there for why.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!bearerToken) {
    return NextResponse.json(
      { error: "Missing API key. Get one at /settings/tokens." },
      { status: 401 },
    );
  }

  const customer = await resolveApiKey(bearerToken);
  if (!customer) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  const { id } = await params;

  const submission = await db.quantumJobSubmission.findUnique({ where: { jobId: id } });
  if (!submission || submission.customerId !== customer.id) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const proxyRes = await fetch(
    `${process.env.QUANTUM_PROXY_URL}/jobs/${encodeURIComponent(id)}/result`,
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
  return NextResponse.json(data);
}
