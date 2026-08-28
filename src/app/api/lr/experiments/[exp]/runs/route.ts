import { proxyBackendExperimentsPost } from "@/lib/experiments/proxy";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** POST /api/lr/experiments/{exp}/runs?backend_id= — submit a run. Body forwarded verbatim. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ exp: string }> }) {
  const { exp } = await params;
  const body = await req.json();
  return proxyBackendExperimentsPost(req, `experiments/${encodeURIComponent(exp)}/runs`, body);
}
