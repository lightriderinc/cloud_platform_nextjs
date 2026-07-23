"use client";

import { useState } from "react";

/**
 * Redirects to Stripe Checkout for the validation-test subscription price —
 * used to exercise the Stripe -> Logto role-assignment webhook flow
 * end-to-end without touching the real pricing tiers.
 */
export function ValidationCheckoutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout/validate", {
        method: "POST",
      });
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
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "default-radius bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
        }
      >
        {loading ? "Redirecting…" : "Run validation checkout"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
