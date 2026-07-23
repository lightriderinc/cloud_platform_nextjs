import { getAccessTier } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/access-tier
 *
 * Returns the caller's access tier ("Pro" | "Basic") so client components
 * can proactively show an upgrade prompt before attempting a Pro-gated
 * action, instead of only surfacing it as a submit error. Not itself the
 * enforcement point — see /api/lr/[...path]/route.ts for that.
 */
export async function GET() {
  const tier = await getAccessTier();
  return NextResponse.json({ tier });
}
