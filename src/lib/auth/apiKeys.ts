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

/** Resolves a bearer token to its owning Customer, recording last-used time. */
export async function resolveApiKey(bearerToken: string) {
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

  return apiKey.customer;
}
