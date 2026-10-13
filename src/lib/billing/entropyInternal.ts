import type { Customer } from "@prisma/client";
import { NextResponse } from "next/server";
import { findApiKey } from "@/lib/auth/apiKeys";
import {
  authenticateApiKeyCall,
  authenticateServiceCall,
  hasForwardedApiKey,
  ServiceAuthError,
  type ServiceCaller,
} from "@/lib/auth/serviceAuth";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { db } from "@/lib/billing/db";

/**
 * Shared wrapper for /api/internal/entropy/* routes: checks the shared
 * billing secret, then the user's access token (lib/auth/serviceAuth.ts),
 * resolves the user's
 * Customer, and maps failures to JSON errors. `create` provisions a Customer
 * for a first-time user (charge and checkout); read/settle/refund paths
 * never create one.
 *
 * `allowApiKey` (charge, settle and refund only) also accepts the customer's
 * own Light Rider API key, forwarded by the entropy server for developer-API
 * draws, in place of a user token. The Customer is then the key's owner, and
 * no Customer is ever created that way.
 */
export async function withEntropyCustomer(
  request: Request,
  opts: { create: boolean; email?: string; allowApiKey?: boolean },
  handler: (customer: Customer, caller: ServiceCaller) => Promise<Response>,
): Promise<Response> {
  let caller: ServiceCaller;
  let customer: Customer | null = null;
  try {
    if (hasForwardedApiKey(request)) {
      if (!opts.allowApiKey) throw new ServiceAuthError("This route needs a user token.", 403);
      const found = await findApiKey(authenticateApiKeyCall(request));
      if (!found) throw new ServiceAuthError("Invalid API key.");
      customer = found.customer;
      caller = { userSub: found.customer.logtoUserId, apiKeyPrefix: found.keyPrefix };
    } else {
      caller = await authenticateServiceCall(request);
    }
  } catch (err) {
    if (err instanceof ServiceAuthError) {
      if (err.status === 500) console.error("[internal/entropy] auth misconfigured:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  if (!caller.apiKeyPrefix) {
    customer = opts.create
      ? await getOrCreateCustomer(caller.userSub, opts.email || undefined)
      : await db.customer.findUnique({ where: { logtoUserId: caller.userSub } });
  }
  if (!customer) {
    return NextResponse.json({ error: "No billing account for this user yet." }, { status: 404 });
  }
  return handler(customer, caller);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}
