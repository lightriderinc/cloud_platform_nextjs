import { resolveApiKey } from "@/lib/auth/apiKeys";
import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
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
 *
 * `createIfMissing`: when true, a signed-in user with no Customer row yet
 * gets one created on the spot (via getOrCreateCustomer, which also grants
 * their one-time signup credit) — used by the submit route, since that's
 * commonly a brand-new user's first relevant request. Left false (default)
 * for read-only routes (job status/list) — viewing your own jobs shouldn't
 * have the side effect of provisioning a Stripe customer for someone who's
 * never submitted anything.
 */
export async function resolveCustomerFromRequest(
  req: Request,
  options: { createIfMissing?: boolean } = {},
): Promise<Customer | null> {
  try {
    const user = await requireLogtoUser();
    if (options.createIfMissing) {
      return await getOrCreateCustomer(user.sub, user.email);
    }
    const customer = await db.customer.findUnique({ where: { logtoUserId: user.sub } });
    if (customer) return customer;
  } catch {
    // Not signed in via session — fall through to bearer key.
  }

  const bearerToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!bearerToken) return null;

  return resolveApiKey(bearerToken);
}
