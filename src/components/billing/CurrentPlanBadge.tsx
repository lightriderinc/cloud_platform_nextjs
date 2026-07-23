"use client";

import { useQuery } from "@tanstack/react-query";

type Subscription = {
  id: string;
  kind: string;
  tier: string | null;
  status: string;
};

async function fetchSubscriptions(): Promise<Subscription[]> {
  const res = await fetch("/api/billing/subscription");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.subscriptions;
}

function planLabel(subscription: Subscription): string {
  if (subscription.tier) {
    return subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1);
  }
  return subscription.kind === "API_PLAN" ? "API" : "User";
}

/** Compact one-line "Current plan: X" summary shown next to the Pro/Basic badge on the account page. */
export default function CurrentPlanBadge() {
  const { data: subscriptions } = useQuery({
    queryKey: ["billing", "subscriptions"],
    queryFn: fetchSubscriptions,
  });

  const active = subscriptions?.find(
    (s) => s.status === "active" || s.status === "trialing",
  );
  if (!active) return null;

  return (
    <p className="text-sm text-gray-500">Current plan: {planLabel(active)}</p>
  );
}
