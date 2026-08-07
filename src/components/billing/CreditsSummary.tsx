"use client";

import HintIcon from "@/components/HintIcon";
import LRButton from "@/components/ui/LRButton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MdArrowForward, MdLockOutline } from "react-icons/md";

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

/**
 * Displays a cents balance as a whole credit count — 1 credit = $0.01 = 1
 * cent, so no conversion is needed (unlike formatUsd, which divides by 100
 * for an actual dollar figure).
 */
export function formatCredits(cents: number): string {
  return cents.toLocaleString();
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
 * Credit ledger balance, displayed as "Light Rider credits" — this is a
 * display-label choice for the Pro-plan/billing context only (used on its
 * own on the Payment page and composed into UsageSummary on the Billing
 * page). The underlying CreditLedgerEntry/creditsBalanceCents fields, and
 * the Quantum Compute page's own "compute credits" copy, are unchanged.
 */
export default function CreditsSummary({
  historyLink = false,
}: {
  historyLink?: boolean;
}) {
  const credits = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
  });

  if (!credits.data) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-100 default-radius flex-col gap-2 flex p-4">
          <div className="h-5 bg-gray-200 w-40 rounded"></div>
          <div className="h-3 bg-gray-200 w-full rounded"></div>
          <div className="h-3 bg-gray-200 w-3/4 rounded"></div>
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
      <div className="default-radius border border-gray-50 bg-gray-50 p-4">
        <p className="mb-1 flex items-center gap-1.5 font-medium text-gray-800 opacity-80">
          <MdLockOutline className="text-gray-400" />
          Unlock {formatCredits(credits.data.remainingCents)} bonus Light Rider credits
        </p>
        <p className="text-xs text-gray-500">
          Complete your first purchase to claim your credits.
        </p>
        <div className="flex mt-6">
          <a href="/settings/purchases/quantum-compute">
            <LRButton variant="primary">Purchase compute credits</LRButton>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="default-radius border border-gray-50 bg-gray-50 p-4">
      <p className="mb-2 flex items-end gap-1.5 text-gray-800">
        <span className="text-4xl font-medium mr-1">
          {formatCredits(credits.data.remainingCents)}
        </span>{" "}
        <span className="pb-1">
          Light Rider credits remaining{" "}
          <HintIcon text="Simulator (mock) jobs are free and never deduct credits. QPU jobs (Garnet, Emerald, Sirius) deduct credits per shot at submission time." />
        </span>
      </p>

      <div className="flex w-full justify-between items-end mt-8">
        <a href="/settings/purchases/quantum-compute">
          <LRButton variant="primary">Purchase compute credits</LRButton>
        </a>
        {historyLink && (
          <Link
            href="/settings/usage"
            className="text-sm font-medium text-gray-700 inline-flex items-center gap-2 hover:text-[var(--brand-primary)]"
          >
            View purchase history <MdArrowForward />
          </Link>
        )}
      </div>
    </div>
  );
}
