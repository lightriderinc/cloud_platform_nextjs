import { NextRequest, NextResponse } from "next/server";
import {
  presentStatus,
  type BackendStatusResponse,
  type StatusSource,
} from "@/lib/backends/status/present";
import { loadStatusMemories } from "@/lib/backends/status/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/backends/status - the server-side status light, read-only.
 *
 * Reads the verdicts the poller stored (never calls a provider), applies the
 * staleness watchdog, and returns ages measured on the server clock so the
 * browser never compares its own clock with ours.
 *
 * IQM_STATUS_SOURCE picks what the IQM cards show: "server" for this light, or
 * anything else (default) for the legacy browser-computed light. In legacy
 * mode only `{ source }` is returned, unless `?shadow=1` asks for the server
 * verdicts anyway (for comparing during shadow mode).
 */
export async function GET(request: NextRequest) {
  const source: StatusSource =
    process.env.IQM_STATUS_SOURCE === "server" ? "server" : "legacy";
  const shadow = request.nextUrl.searchParams.get("shadow") === "1";

  if (source === "legacy" && !shadow) {
    return NextResponse.json({ source } satisfies BackendStatusResponse, {
      headers: NO_STORE,
    });
  }

  try {
    const memories = await loadStatusMemories();
    const now = Date.now();
    const backends = Object.fromEntries(
      [...memories].map(([backendId, memory]) => [
        backendId,
        presentStatus(memory, now),
      ]),
    );
    return NextResponse.json(
      { source, backends } satisfies BackendStatusResponse,
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error(
      "[backend-status] read failed:",
      err instanceof Error ? err.message : String(err),
    );
    // Still say which source is active, so the browser shows "Checking"
    // rather than falling back to the legacy light.
    return NextResponse.json({ source } satisfies BackendStatusResponse, {
      status: 503,
      headers: NO_STORE,
    });
  }
}
