import { proxyEntropyWithdrawPost } from "@/lib/entropy/proxy";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** POST /api/lr/entropy/withdraw?backend_id= — instant withdrawal from one or more chiplet pools. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyEntropyWithdrawPost(req, body);
}
