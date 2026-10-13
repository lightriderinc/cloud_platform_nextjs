import { NextResponse } from "next/server";
import { hashKey } from "@/lib/auth/apiKeys";
import { authenticateApiKeyCall, ServiceAuthError } from "@/lib/auth/serviceAuth";
import { db } from "@/lib/billing/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Entropy developer-API requests per key per minute. */
const ENTROPY_API_RATE_LIMIT_PER_MINUTE = 60;

/**
 * POST /api/internal/entropy/api-key/resolve  (entropy platform server only)
 * Headers: X-Entropy-Billing-Secret, X-LR-Api-Key: <the developer's key>
 *
 * Who owns this Light Rider API key, for an entropy developer-API request -
 * the entropy site needs the owner's Logto id before it records a draw (no
 * row, no charge). Also counts the request against the key's one-minute
 * window: the key lookup, the window reset-or-increment and last-used time
 * are ONE statement, so concurrent requests on any instance can't slip past
 * the limit.
 *
 * 200 { logtoUserId, keyPrefix, rateLimitPerMinute }
 * 401 invalid key   429 { error: "rate_limited", retryAfterSeconds }
 */
export async function POST(request: Request) {
  let key: string;
  try {
    key = authenticateApiKeyCall(request);
  } catch (err) {
    if (err instanceof ServiceAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const rows = await db.$queryRaw<
    { customerId: string; keyPrefix: string; rateWindowCount: number; rateWindowStart: Date }[]
  >`
    UPDATE "ApiKey" SET
      "rateWindowStart" = CASE
        WHEN "rateWindowStart" IS NULL OR "rateWindowStart" <= now() - interval '60 seconds'
        THEN now() ELSE "rateWindowStart" END,
      "rateWindowCount" = CASE
        WHEN "rateWindowStart" IS NULL OR "rateWindowStart" <= now() - interval '60 seconds'
        THEN 1 ELSE "rateWindowCount" + 1 END,
      "lastUsedAt" = now()
    WHERE "keyHash" = ${hashKey(key)}
    RETURNING "customerId", "keyPrefix", "rateWindowCount", "rateWindowStart"`;
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Invalid API key." }, { status: 401 });

  if (row.rateWindowCount > ENTROPY_API_RATE_LIMIT_PER_MINUTE) {
    const elapsed = (Date.now() - new Date(row.rateWindowStart).getTime()) / 1000;
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: Math.max(1, Math.ceil(60 - elapsed)) },
      { status: 429 },
    );
  }

  const customer = await db.customer.findUnique({ where: { id: row.customerId }, select: { logtoUserId: true } });
  if (!customer) return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  return NextResponse.json({
    logtoUserId: customer.logtoUserId,
    keyPrefix: row.keyPrefix,
    rateLimitPerMinute: ENTROPY_API_RATE_LIMIT_PER_MINUTE,
  });
}
