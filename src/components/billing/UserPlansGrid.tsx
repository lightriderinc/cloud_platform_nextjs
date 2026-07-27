"use client";

import PlanCard from "@/components/billing/PlanCard";
import { USER_PLANS } from "@/lib/billing/plans";
import { useState } from "react";

// V2 two-tier simplification: only Basic (free) and Pro render here. Pro
// checkout is disabled for now (see the V2 product-model migration) — the
// card stays visible as a preview, but its action is a static "Coming soon"
// badge, not a real checkout button. The Stripe/webhook/Pro-role plumbing
// underneath is untouched and still fully functional, just unreachable from
// here; POST /api/billing/checkout/subscription also rejects
// kind=user_plan/tier=pro server-side so this isn't just a hidden button.
// Starter/Developer/Professional/Enterprise still exist in plans.ts —
// restore by re-adding <PlanCard> entries for them to the grid below (see
// git history for the exact previous JSX, or plans.ts for the tier data).
export default function UserPlansGrid() {
  const [selected, setSelected] = useState<"basic" | "pro">("pro");
  const pro = USER_PLANS.pro;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <PlanCard
        name="Basic"
        price="Free"
        description="Included with your account."
        features={[
          "Access to core applications",
          "Simulator & demo circuits",
          "Community support",
        ]}
        selected={selected === "basic"}
        onSelect={() => setSelected("basic")}
        action={
          <div className="w-full default-radius border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-500">
            Included with your account
          </div>
        }
      />
      <PlanCard
        name={pro.name}
        price={`$${pro.monthlyUsd}`}
        billedNote="/mo"
        description="Run jobs on real quantum hardware."
        badge="Coming soon"
        features={[
          "Everything in Basic",
          "Run jobs on real QPUs",
          `${pro.includedCreditsUsd} Light Rider tokens included`,
          "Priority support",
        ]}
        selected={selected === "pro"}
        onSelect={() => setSelected("pro")}
        action={
          <div className="w-full default-radius border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-500">
            Coming soon
          </div>
        }
      />
    </div>
  );
}
