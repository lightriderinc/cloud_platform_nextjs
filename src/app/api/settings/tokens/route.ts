import { createApiKeyFor, getApiKeyInfo, revokeApiKeyFor } from "@/lib/auth/apiKeys";
import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { NextResponse } from "next/server";

/**
 * GET/POST/DELETE /api/settings/tokens
 *
 * One API key per Customer (enforced by the `customerId` unique constraint).
 * The full key is only ever returned once, at creation — everywhere else it
 * resolves to just the stored keyPrefix. The logic lives in
 * @/lib/auth/apiKeys, shared with the entropy platform's
 * /api/internal/entropy/api-key routes (same key, managed from either site).
 */
export async function GET() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);
  return NextResponse.json({ apiKey: await getApiKeyInfo(customer.id) });
}

export async function POST() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  const created = await createApiKeyFor(customer.id);
  if (!created) {
    return NextResponse.json(
      { error: "Key already exists. Rotate instead of generating a new one." },
      { status: 409 },
    );
  }

  return NextResponse.json(created);
}

export async function DELETE() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  await revokeApiKeyFor(customer.id);
  return NextResponse.json({ revoked: true });
}
