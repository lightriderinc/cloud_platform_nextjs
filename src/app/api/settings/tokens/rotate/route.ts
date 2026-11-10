import { rotateApiKeyFor } from "@/lib/auth/apiKeys";
import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { NextResponse } from "next/server";

/**
 * POST /api/settings/tokens/rotate
 *
 * Overwrites the stored key hash in place — the old key's hash is gone the
 * instant this write commits, so any request already in flight with the old
 * key fails lookup immediately. No grace period, no dual-valid window.
 * (Logic in @/lib/auth/apiKeys, shared with the entropy platform.)
 */
export async function POST() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  return NextResponse.json(await rotateApiKeyFor(customer.id));
}
