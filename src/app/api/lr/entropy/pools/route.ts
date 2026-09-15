import { proxyEntropyPoolsGet } from "@/lib/entropy/proxy";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/lr/entropy/pools?backend_id= — per-chiplet entropy pool inventory. */
export async function GET(req: NextRequest) {
  return proxyEntropyPoolsGet(req);
}
