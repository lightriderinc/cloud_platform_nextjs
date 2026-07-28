"use client";

import { fetchJson, formatUsd, type Credits } from "@/components/billing/CreditsSummary";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MdClose, MdWarningAmber } from "react-icons/md";

// 10 Light Rider tokens ($1/token, same unit as creditsBalanceCents).
const LOW_CREDIT_THRESHOLD_CENTS = 1000;

const DISMISS_KEY = "lr_low_credits_dismissed";

/**
 * Amber warning banner shown on the Dashboard when a customer who has
 * actually bought tokens before is running low. Reuses the same
 * /api/billing/credits query (and query key) as CreditsSummary, so mounting
 * both on one page costs no extra request. Dismiss is sessionStorage-backed
 * — cleared per browser session, so it reappears next visit if still low,
 * unlike the localStorage-based "seen once" flags used elsewhere in the app.
 */
export default function LowCreditsBanner() {
  // Defaults to hidden until the sessionStorage check below resolves, so a
  // previously-dismissed banner never flashes on screen before hiding again.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  const { data } = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
  });

  const isLow =
    !!data &&
    data.purchasedCents > 0 &&
    data.remainingCents <= LOW_CREDIT_THRESHOLD_CENTS;

  if (!isLow || dismissed) {
    return null;
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="mb-6 flex items-start gap-2 default-radius border-l-2 border-amber-400 bg-amber-50 py-2 pl-3 pr-3">
      <MdWarningAmber className="mt-0.5 shrink-0 text-lg text-amber-500" />
      <p className="flex-1 text-sm text-black">
        Only {formatUsd(data!.remainingCents)} Light Rider tokens left — top up
        to keep running jobs on real hardware.
      </p>
      <Link
        href="/settings/pricing/quantum-compute"
        className="shrink-0 default-radius bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
      >
        Buy more tokens
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-amber-500 transition-colors hover:text-amber-700"
      >
        <MdClose />
      </button>
    </div>
  );
}
