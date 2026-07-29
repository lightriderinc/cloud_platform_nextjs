"use client";

import LRButton from "@/components/ui/LRButton";
import { useState } from "react";

type SubscriptionCheckoutProps = {
  kind: "user_plan" | "api_plan";
  tier: string;
  label: string;
  className?: string;
};

/** Redirects to Stripe Checkout for a fixed-price subscription tier. */
export function SubscriptionCheckoutButton({
  kind,
  tier,
  label,
  className,
}: SubscriptionCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "w-full default-radius bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
        }
      >
        {loading ? "Redirecting…" : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Redirects to Stripe Checkout for a one-time compute-credits top-up. */
export function CreditsCheckoutButton({
  amountUsd,
  label,
  className,
}: {
  amountUsd: number;
  label: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <LRButton
        onClick={handleClick}
        disabled={loading}
        variant="primary"
        className={className ?? "w-full"}
      >
        {loading ? "Redirecting…" : label}
      </LRButton>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Sends the signed-in user to the Stripe Customer Portal. */
export function ManageBillingButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <LRButton
        onClick={handleClick}
        disabled={loading}
        variant="primary-outline"
        className={className ?? "min-w-[110px] w-full"}
      >
        {loading ? "Loading…" : "Manage billing"}
      </LRButton>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
