import { generateApiKey } from "@/lib/auth/apiKeys";
import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { db } from "@/lib/billing/db";
import { NextResponse } from "next/server";

/**
 * GET/POST/DELETE /api/settings/tokens
 *
 * One API key per Customer (enforced by the `customerId` unique constraint).
 * The full key is only ever returned once, at creation — everywhere else it
 * resolves to just the stored keyPrefix.
 */
export async function GET() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  const apiKey = await db.apiKey.findUnique({
    where: { customerId: customer.id },
    select: { keyPrefix: true, createdAt: true, lastUsedAt: true, rotatedAt: true },
  });

  return NextResponse.json({ apiKey: apiKey ?? null });
}

export async function POST() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  const existing = await db.apiKey.findUnique({
    where: { customerId: customer.id },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Key already exists. Rotate instead of generating a new one." },
      { status: 409 },
    );
  }

  const { fullKey, keyHash, keyPrefix } = generateApiKey();
  await db.apiKey.create({
    data: { customerId: customer.id, keyHash, keyPrefix },
  });

  return NextResponse.json({ key: fullKey, keyPrefix });
}

export async function DELETE() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  await db.apiKey.delete({ where: { customerId: customer.id } }).catch(() => {});
  return NextResponse.json({ revoked: true });
}
