"use client";

import { SubscriptionCheckoutButton } from "@/components/billing/CheckoutButtons";
import PlanCard from "@/components/billing/PlanCard";
import { USER_PLANS } from "@/lib/billing/plans";
import { useState } from "react";

// V2 two-tier simplification: only Basic (free) and Pro (paid) render here.
// Starter/Developer/Professional/Enterprise still exist in plans.ts and
// their checkout/webhook plumbing is untouched — restore by re-adding
// <PlanCard> entries for them to the grid below (see git history for the
// exact previous JSX, or plans.ts for the tier data).
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
        badge="Recommended"
        features={[
          "Everything in Basic",
          "Run jobs on real QPUs",
          `${pro.includedCreditsUsd} Light Rider tokens included`,
          "Priority support",
        ]}
        selected={selected === "pro"}
        onSelect={() => setSelected("pro")}
        action={
          <SubscriptionCheckoutButton
            kind="user_plan"
            tier="pro"
            label="Choose Pro"
          />
        }
      />
    </div>
  );
}
