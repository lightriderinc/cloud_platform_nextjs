// Server-only. Never import this from a client component — it hashes and
// generates the actual secret key material.
import { db } from "@/lib/billing/db";
import { createHash, randomBytes } from "crypto";

const PREFIX = process.env.NODE_ENV === "production" ? "lr_live_" : "lr_test_";

export function generateApiKey() {
  const raw = randomBytes(24).toString("hex");
  const fullKey = `${PREFIX}${raw}`;
  const keyHash = hashKey(fullKey);
  const keyPrefix = fullKey.slice(0, PREFIX.length + 8);
  return { fullKey, keyHash, keyPrefix };
}

export function hashKey(fullKey: string): string {
  return createHash("sha256").update(fullKey).digest("hex");
}

/** Well-formed Light Rider API key (either environment's prefix). */
export const API_KEY_RE = /^lr_(live|test)_[0-9a-f]{48}$/;

/** Resolves a bearer token to its owning Customer, recording last-used time. */
export async function resolveApiKey(bearerToken: string) {
  return (await findApiKey(bearerToken))?.customer ?? null;
}

/**
 * The ApiKey row (with its Customer) behind a bearer token, recording
 * last-used time - resolveApiKey plus the key's own fields (its prefix).
 */
export async function findApiKey(bearerToken: string) {
  const keyHash = hashKey(bearerToken);
  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: { customer: true },
  });
  if (!apiKey) return null;

  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return apiKey;
}

// ---------------------------------------------------------------------------
// Key management for one Customer - the single implementation behind cloud's
// own /api/settings/tokens routes AND the entropy platform's
// /api/internal/entropy/api-key routes, so both sites manage the very same
// key (one per Customer) with the same rules.
// ---------------------------------------------------------------------------

export type ApiKeyInfo = {
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  rotatedAt: Date | null;
};

/** The customer's key metadata (never the key or its hash), or null. */
export async function getApiKeyInfo(customerId: string): Promise<ApiKeyInfo | null> {
  return db.apiKey.findUnique({
    where: { customerId },
    select: { keyPrefix: true, createdAt: true, lastUsedAt: true, rotatedAt: true },
  });
}

/**
 * Creates the customer's key. Returns the full key ONCE, or null when one
 * already exists (rotate instead).
 */
export async function createApiKeyFor(customerId: string): Promise<{ key: string; keyPrefix: string } | null> {
  const existing = await db.apiKey.findUnique({ where: { customerId } });
  if (existing) return null;
  const { fullKey, keyHash, keyPrefix } = generateApiKey();
  await db.apiKey.create({ data: { customerId, keyHash, keyPrefix } });
  return { key: fullKey, keyPrefix };
}

/**
 * Overwrites the stored key hash in place - the old key's hash is gone the
 * instant this write commits, so any request already in flight with the old
 * key fails lookup immediately. No grace period, no dual-valid window.
 */
export async function rotateApiKeyFor(customerId: string): Promise<{ key: string; keyPrefix: string }> {
  const { fullKey, keyHash, keyPrefix } = generateApiKey();
  await db.apiKey.upsert({
    where: { customerId },
    update: { keyHash, keyPrefix, rotatedAt: new Date() },
    create: { customerId, keyHash, keyPrefix },
  });
  return { key: fullKey, keyPrefix };
}

/** Deletes the customer's key (if any); it stops working immediately. */
export async function revokeApiKeyFor(customerId: string): Promise<void> {
  await db.apiKey.delete({ where: { customerId } }).catch(() => {});
}
