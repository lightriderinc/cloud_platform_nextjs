import { proxyTopologyGet } from "@/lib/topology/proxy";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/lr/topology/edges?backend_id= — see proxyTopologyGet. */
export async function GET(req: NextRequest) {
  return proxyTopologyGet(req, "edges");
}
