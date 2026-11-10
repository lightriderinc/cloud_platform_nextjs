import { NextResponse } from "next/server";
import { runStatusPoll } from "@/lib/backends/status/poll";
import { iqmStatusProbe } from "@/lib/iqm/statusProbe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/backend-status - Vercel Cron, every minute (see vercel.json).
 *
 * The status light's only writer: probes IQM, folds each reading into that
 * backend's stored status (src/lib/backends/status), logs the reading, and
 * prunes week-old observations. Runs whatever IQM_STATUS_SOURCE is set to, so
 * "legacy" doubles as shadow mode. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { results, pruned } = await runStatusPoll(iqmStatusProbe);
    return NextResponse.json({ results, pruned });
  } catch (err) {
    console.error(
      "[backend-status] poll failed:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ error: "Status poll failed." }, { status: 500 });
  }
}
