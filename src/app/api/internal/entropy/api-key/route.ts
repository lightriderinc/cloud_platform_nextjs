import { NextResponse } from "next/server";
import { createApiKeyFor, getApiKeyInfo, revokeApiKeyFor } from "@/lib/auth/apiKeys";
import { withEntropyCustomer } from "@/lib/billing/entropyInternal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET/POST/DELETE /api/internal/entropy/api-key  (entropy platform server only)
 *
 * The signed-in user's ONE Light Rider API key, managed from the entropy site:
 * exactly what cloud's own /api/settings/tokens does (same functions in
 * @/lib/auth/apiKeys, same ApiKey row), so a change on either site applies to
 * both at once. Auth like the wallet: shared secret + the user's own Logto
 * token. A forwarded API key is refused here - a key can never manage keys.
 *
 * GET    -> { apiKey: { keyPrefix, createdAt, lastUsedAt, rotatedAt } | null }
 * POST   -> { key, keyPrefix }  (shown once) | 409 if a key exists (rotate instead)
 * DELETE -> { revoked: true }
 */
export async function GET(request: Request) {
  return withEntropyCustomer(request, { create: true }, async (customer) =>
    NextResponse.json({ apiKey: await getApiKeyInfo(customer.id) }),
  );
}

export async function POST(request: Request) {
  return withEntropyCustomer(request, { create: true }, async (customer) => {
    const created = await createApiKeyFor(customer.id);
    if (!created) {
      return NextResponse.json(
        { error: "key_exists", message: "Key already exists. Rotate instead of generating a new one." },
        { status: 409 },
      );
    }
    return NextResponse.json(created, { headers: { "Cache-Control": "no-store" } });
  });
}

export async function DELETE(request: Request) {
  return withEntropyCustomer(request, { create: true }, async (customer) => {
    await revokeApiKeyFor(customer.id);
    return NextResponse.json({ revoked: true });
  });
}
