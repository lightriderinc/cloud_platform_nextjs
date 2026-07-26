"use client";

import HintIcon from "@/components/HintIcon";
import { useQuery } from "@tanstack/react-query";

export type Credits = {
  purchasedCents: number;
  usedCents: number;
  remainingCents: number;
};

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function ProgressBar({ fraction }: { fraction: number }) {
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <div className="h-2 w-full default-radius bg-gray-200">
      <div
        className="h-2 default-radius bg-[var(--brand-primary)]"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}

/**
 * Credit ledger balance, displayed as "Light Rider tokens" — this is a
 * display-label choice for the Pro-plan/billing context only (used on its
 * own on the Payment page and composed into UsageSummary on the Billing
 * page). The underlying CreditLedgerEntry/creditsBalanceCents fields, and
 * the Quantum Compute page's own "compute credits" copy, are unchanged.
 */
export default function CreditsSummary() {
  const credits = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
  });

  if (!credits.data || credits.data.purchasedCents <= 0) {
    return null;
  }

  return (
    <div className="default-radius border border-gray-200 bg-white p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-800">
        {formatUsd(credits.data.remainingCents)} Light Rider tokens remaining
        of {formatUsd(credits.data.purchasedCents)} purchased
        <HintIcon text="Remaining reflects Light Rider tokens granted so far — nothing is deducted yet since job usage isn't metered." />
      </p>
      <ProgressBar
        fraction={credits.data.remainingCents / credits.data.purchasedCents}
      />
    </div>
  );
}
