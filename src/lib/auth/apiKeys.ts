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
