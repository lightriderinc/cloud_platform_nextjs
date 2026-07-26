import { resolveApiKey } from "@/lib/auth/apiKeys";
import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import type { Customer } from "@prisma/client";

/**
 * Resolves the Customer behind a request to /api/lr/quantum/*, accepting
 * either auth mode:
 *   - Logto browser session — in-app calls (DemoCircuitModal, NewJobModal),
 *     same-origin fetch() carries session cookies automatically, no code
 *     needed at the call site.
 *   - `Authorization: Bearer lr_...` API key — external SDK/Colab callers.
 * Session is tried first since it's the common in-app case; bearer key is
 * the fallback for genuinely external callers. The two never overlap: a
 * browser session never sends an Authorization header, and an external
 * script never carries session cookies.
 */
export async function resolveCustomerFromRequest(req: Request): Promise<Customer | null> {
  try {
    const user = await requireLogtoUser();
    const customer = await db.customer.findUnique({ where: { logtoUserId: user.sub } });
    if (customer) return customer;
  } catch {
    // Not signed in via session — fall through to bearer key.
  }

  const bearerToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!bearerToken) return null;

  return resolveApiKey(bearerToken);
}
