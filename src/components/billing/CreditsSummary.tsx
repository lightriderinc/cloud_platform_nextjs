"use client";

import HintIcon from "@/components/HintIcon";
import { useQuery } from "@tanstack/react-query";
import { MdLockOutline } from "react-icons/md";

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

  if (!credits.data) {
    return (
      <div className="animate-pulse">
        <div className="default-radius border border-gray-50 bg-gray-50 flex-col gap-2 flex p-4">
          <div className="h-4 bg-gray-200 w-200 rounded"></div>
          <div className="h-2 bg-gray-200 w-full rounded"></div>
        </div>
      </div>
    );
  }

  // Same purchasedCents <= 0 check BackendSubmitModal uses to gate real QPU
  // access — this is purely cosmetic (nothing here blocks anything), just
  // making it visible that the signup grant shown below isn't spendable on
  // real hardware yet.
  if (credits.data.purchasedCents <= 0) {
    return (
      <div className="default-radius border border-gray-50 bg-50 p-4 opacity-50">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-800">
          <MdLockOutline className="text-gray-400" />
          {formatUsd(credits.data.remainingCents)} Light Rider tokens
        </p>
        <p className="text-xs text-gray-500">Unlocks after your first purchase.</p>
      </div>
    );
  }

  return (
    <div className="default-radius border border-gray-50 bg-gray-50 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-800">
        {formatUsd(credits.data.remainingCents)} Light Rider tokens remaining
        of {formatUsd(credits.data.purchasedCents)} purchased
        <HintIcon text="Simulator (mock) jobs are free and never deduct tokens. QPU jobs (Garnet, Emerald, Sirius) deduct tokens per shot at submission time." />
      </p>
      <ProgressBar
        fraction={credits.data.remainingCents / credits.data.purchasedCents}
      />
    </div>
  );
}
