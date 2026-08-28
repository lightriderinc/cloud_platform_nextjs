import { proxyTopologyGet } from "@/lib/topology/proxy";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/lr/topology/status?backend_id= — passthrough to qpu-proxy's /topology/status. See proxyTopologyGet. */
export async function GET(req: NextRequest) {
  return proxyTopologyGet(req, "topology/status");
}
