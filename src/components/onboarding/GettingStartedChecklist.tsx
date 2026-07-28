"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const EXPLORED_APPLICATIONS_KEY = "lr_explored_applications";

type Status = {
  hasPlanOrCredits: boolean;
  hasRunJob: boolean;
  hasExploredApplications: boolean;
};

async function fetchOnboardingStatus(): Promise<{ hasPlanOrCredits: boolean }> {
  const res = await fetch("/api/onboarding/status");
  if (!res.ok) return { hasPlanOrCredits: false };
  return res.json();
}

// QuantumJobSubmission-backed list (same source /jobs itself reads) — not
// the old /api/lr/jobs, which is scoped to a different iqm-proxy identity
// and no longer receives anything submitted through the current path.
async function fetchHasRunJob(): Promise<boolean> {
  const res = await fetch("/api/lr/quantum/jobs");
  if (!res.ok) return false;
  const data = await res.json();
  return (data.jobs ?? []).length > 0;
}

export default function GettingStartedChecklist() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchOnboardingStatus().catch(() => ({ hasPlanOrCredits: false })),
      fetchHasRunJob().catch(() => false),
    ]).then(([onboarding, hasRunJob]) => {
      if (cancelled) return;
      setStatus({
        hasPlanOrCredits: onboarding.hasPlanOrCredits,
        hasRunJob,
        hasExploredApplications:
          localStorage.getItem(EXPLORED_APPLICATIONS_KEY) === "true",
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function markApplicationsExplored() {
    localStorage.setItem(EXPLORED_APPLICATIONS_KEY, "true");
  }

  if (!status) return null;

  const steps = [
    {
      key: "plan",
      label: "Choose a plan or add credits",
      done: status.hasPlanOrCredits,
      href: "/settings/purchases",
    },
    {
      key: "job",
      label: "Run your first job",
      done: status.hasRunJob,
      href: "/jobs",
    },
    {
      key: "apps",
      label: "Explore available applications",
      done: status.hasExploredApplications,
      href: "/applications",
      onClick: markApplicationsExplored,
    },
  ];

  if (steps.every((step) => step.done)) return null;

  return (
    <div className="default-radius bg-gray-50 pl-5 pr-8 pt-4 pb-6 mb-6">
      <h2 className="mb-3 font-bold text-gray-600">First steps</h2>
      <ul className="flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2 text-xs">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center default-radius border text-xs ${
                step.done
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                  : "border-gray-300 text-transparent"
              }`}
            >
              ✓
            </span>
            {step.done ? (
              <span className="text-gray-500">{step.label}</span>
            ) : (
              <Link
                href={step.href}
                onClick={step.onClick}
                className="text-gray-700 hover:underline"
              >
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
