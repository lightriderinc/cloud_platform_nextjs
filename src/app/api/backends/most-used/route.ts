import { db } from "@/lib/billing/db";
import { isUsagePeriod, toRelativeUsage, USAGE_PERIODS, type BackendUsageResponse } from "@/lib/backends/overview";
import { isValidBackend } from "@/lib/quantum/backends";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/backends/most-used?period=week|month|year
//
// Backends ranked by jobs across the platform over the last 7, 30 or 365
// days, from QuantumJobSubmission (one row per submitted job). Read-only.
// Only the ranking and each backend's bar size relative to the top one
// (0 to 1) leave the server: no job counts, customer, job id or cost. Feeds
// the "Most used" panel on /backends, which joins the ranking to the catalog
// cards for names and qubits.
//
// Cached at the edge for 5 minutes; a ranking doesn't need to be live.
const CACHE = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("period");
  const period = raw === null ? "week" : raw;
  if (!isUsagePeriod(period)) {
    return NextResponse.json({ error: "period must be week, month or year." }, { status: 400 });
  }
  const days = USAGE_PERIODS.find((p) => p.id === period)!.days;

  try {
    const rows = await db.quantumJobSubmission.groupBy({
      by: ["backend"],
      where: { createdAt: { gte: new Date(Date.now() - days * DAY_MS) } },
      _count: { _all: true },
    });
    const usage = toRelativeUsage(
      rows.filter((r) => isValidBackend(r.backend)).map((r) => ({ backend: r.backend, jobs: r._count._all })),
    );
    const body: BackendUsageResponse = { period, usage };
    return NextResponse.json(body, { headers: CACHE });
  } catch (err) {
    console.error("[most-used] job count query failed:", err);
    return NextResponse.json({ error: "Usage is unavailable right now." }, { status: 502 });
  }
}
