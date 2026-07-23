"use client";

import CreditsSummary, {
  fetchJson,
  ProgressBar,
} from "@/components/billing/CreditsSummary";
import HintIcon from "@/components/HintIcon";
import { useQuery } from "@tanstack/react-query";

type Credits = {
  purchasedCents: number;
};

type Usage = {
  plan: { tier: string; name: string } | null;
  includedCalls?: number;
  usedCalls?: number;
  remainingCalls?: number;
  currentPeriodEnd?: string | null;
};

export default function UsageSummary() {
  // Only used here to decide whether to render the wrapping container at
  // all — CreditsSummary fetches (and caches, via the same query key) the
  // full credits payload and renders its own block.
  const credits = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
  });
  const usage = useQuery({
    queryKey: ["billing", "usage"],
    queryFn: () => fetchJson<Usage>("/api/billing/usage"),
  });

  const showCredits = (credits.data?.purchasedCents ?? 0) > 0;
  const showUsage = !!usage.data?.plan;

  if (!showCredits && !showUsage) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {showCredits && <CreditsSummary />}

      {showUsage &&
        usage.data &&
        usage.data.includedCalls != null &&
        usage.data.usedCalls != null &&
        usage.data.remainingCalls != null && (
          <div className="default-radius border border-gray-200 bg-white p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-800">
              {usage.data.remainingCalls.toLocaleString()} calls remaining of{" "}
              {usage.data.includedCalls.toLocaleString()} included
              <HintIcon text="Remaining reflects your included call allowance — usage isn't deducted yet since call metering isn't live." />
            </p>
            <ProgressBar
              fraction={usage.data.remainingCalls / usage.data.includedCalls}
            />
          </div>
        )}
    </div>
  );
}
