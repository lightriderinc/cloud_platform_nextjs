import { proxyRunGet } from "@/lib/experiments/proxy";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/lr/experiments/runs/{id} — poll run status. Not backend-scoped upstream. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyRunGet(req, id);
}
