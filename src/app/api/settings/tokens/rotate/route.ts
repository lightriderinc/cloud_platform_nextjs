import { generateApiKey } from "@/lib/auth/apiKeys";
import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { db } from "@/lib/billing/db";
import { NextResponse } from "next/server";

/**
 * POST /api/settings/tokens/rotate
 *
 * Overwrites the stored key hash in place — the old key's hash is gone the
 * instant this write commits, so any request already in flight with the old
 * key fails lookup immediately. No grace period, no dual-valid window.
 */
export async function POST() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  const { fullKey, keyHash, keyPrefix } = generateApiKey();

  await db.apiKey.upsert({
    where: { customerId: customer.id },
    update: { keyHash, keyPrefix, rotatedAt: new Date() },
    create: { customerId: customer.id, keyHash, keyPrefix },
  });

  return NextResponse.json({ key: fullKey, keyPrefix });
}
