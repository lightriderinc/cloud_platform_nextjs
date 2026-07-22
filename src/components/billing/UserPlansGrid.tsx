"use client";

import { SubscriptionCheckoutButton } from "@/components/billing/CheckoutButtons";
import PlanCard from "@/components/billing/PlanCard";
import { useState } from "react";

export default function UserPlansGrid() {
  const [selected, setSelected] = useState<string>("developer");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <PlanCard
        name="Starter"
        price="$99"
        billedNote="/mo"
        description="For individuals and small teams."
        features={[
          "Access to core applications",
          "Shared data & dashboards",
          "Community support",
          "1 user seat",
          "$50 in compute credits included",
        ]}
        selected={selected === "starter"}
        onSelect={() => setSelected("starter")}
        action={
          <SubscriptionCheckoutButton
            kind="user_plan"
            tier="starter"
            label="Choose Starter"
          />
        }
      />
      <PlanCard
        name="Developer"
        price="$499"
        billedNote="/mo"
        description="For developers and growing teams."
        badge="Most popular"
        features={[
          "Everything in Starter",
          "Advanced workflows",
          "API access (limited)",
          "5 user seats",
          "$250 in compute credits included",
        ]}
        selected={selected === "developer"}
        onSelect={() => setSelected("developer")}
        action={
          <SubscriptionCheckoutButton
            kind="user_plan"
            tier="developer"
            label="Choose Developer"
          />
        }
      />
      <PlanCard
        name="Professional"
        price="$2,500"
        billedNote="/mo"
        description="For production workloads."
        features={[
          "Everything in Developer",
          "Custom SLAs & compliance",
          "SSO & role-based access control",
          "25 user seats",
          "$1,500 in compute credits included",
        ]}
        selected={selected === "professional"}
        onSelect={() => setSelected("professional")}
        action={
          <SubscriptionCheckoutButton
            kind="user_plan"
            tier="professional"
            label="Choose Professional"
          />
        }
      />
      <PlanCard
        name="Enterprise"
        price="Custom"
        description="For mission-critical deployments."
        features={[
          "Everything in Professional",
          "Dedicated Success Manager",
          "Unlimited seats",
          "Custom SLAs",
        ]}
        selected={selected === "enterprise"}
        onSelect={() => setSelected("enterprise")}
        action={
          <a
            href="/pricing/enterprise"
            className="block w-full default-radius border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Contact Sales
          </a>
        }
      />
    </div>
  );
}
