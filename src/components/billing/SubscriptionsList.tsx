"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Subscription = {
  id: string;
  kind: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

async function fetchSubscriptions(): Promise<Subscription[]> {
  const res = await fetch("/api/billing/subscription");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.subscriptions;
}

export default function SubscriptionsList() {
  const queryClient = useQueryClient();
  const { data: subscriptions, error } = useQuery({
    queryKey: ["billing", "subscriptions"],
    queryFn: fetchSubscriptions,
  });

  const toggle = useMutation({
    mutationFn: async (subscription: Subscription) => {
      const endpoint = subscription.cancelAtPeriodEnd
        ? "/api/billing/subscription/reactivate"
        : "/api/billing/subscription/cancel";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "subscriptions"] });
    },
  });

  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Something went wrong."}
      </p>
    );
  }

  if (!subscriptions) {
    return <p className="text-sm text-gray-500">Loading subscriptions…</p>;
  }

  if (subscriptions.length === 0) {
    return <p className="text-sm text-gray-500">No subscriptions yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {subscriptions.map((subscription) => {
        const isPending =
          toggle.isPending && toggle.variables?.id === subscription.id;

        return (
          <li
            key={subscription.id}
            className="flex items-center justify-between gap-4 default-radius border border-gray-200 bg-white p-4"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">
                {subscription.status}
                {subscription.cancelAtPeriodEnd && " (cancels at period end)"}
              </p>
              <p className="text-xs text-gray-500">
                {subscription.currentPeriodEnd
                  ? `Period end: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : "No period end on file"}
              </p>
            </div>
            <button
              onClick={() => toggle.mutate(subscription)}
              disabled={isPending}
              className="default-radius border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
            >
              {isPending
                ? "Working…"
                : subscription.cancelAtPeriodEnd
                  ? "Reactivate"
                  : "Cancel"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
