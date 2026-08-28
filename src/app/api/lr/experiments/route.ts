import { proxyBackendExperimentsGet } from "@/lib/experiments/proxy";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/lr/experiments?backend_id= — experiment catalog listing. */
export async function GET(req: NextRequest) {
  return proxyBackendExperimentsGet(req, "experiments");
}
