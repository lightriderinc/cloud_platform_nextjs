type Subscription = { tier: string | null; status: string };

async function fetchSubscriptions(): Promise<Subscription[]> {
  const res = await fetch("/api/billing/subscription");
  if (!res.ok) return [];
  const data = await res.json();
  return data.subscriptions ?? [];
}

/**
 * Client-side "is this signed-in user Pro" check, matching the same DB
 * subscription state /settings/payment displays (tier: "pro" + active/
 * trialing) — the same source of truth the server-side gate in
 * /api/lr/quantum/submit now uses (isProCustomer). Deliberately NOT the
 * Logto role (/api/auth/access-tier) — that role is only ever set as a
 * side effect of the Stripe webhook and can silently drift from actual
 * subscription state, which is exactly what caused Pro subscribers to see
 * an incorrect upgrade prompt before this fix.
 */
export async function fetchIsProFromSubscriptions(): Promise<boolean> {
  const subscriptions = await fetchSubscriptions();
  return subscriptions.some(
    (s) => s.tier === "pro" && (s.status === "active" || s.status === "trialing"),
  );
}
