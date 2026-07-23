"use client";

import { SubscriptionCheckoutButton } from "@/components/billing/CheckoutButtons";
import PlanCard from "@/components/billing/PlanCard";
import { useState } from "react";

export default function ApiPlansGrid() {
  const [selected, setSelected] = useState<string>("developer");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      <PlanCard
        name="Free"
        price="$0"
        billedNote="/mo"
        description="For testing only."
        features={["10,000 API calls/mo", "Shared entropy pool", "Rate limited", "No SLA"]}
        selected={selected === "free"}
        onSelect={() => setSelected("free")}
        action={
          <span className="block w-full default-radius border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-500">
            Included with your account
          </span>
        }
      />
      <PlanCard
        name="Starter"
        price="$99"
        billedNote="/mo"
        features={["250,000 API calls/mo", "Full API access", "Usage dashboard", "Commercial use"]}
        selected={selected === "starter"}
        onSelect={() => setSelected("starter")}
        action={
          <SubscriptionCheckoutButton kind="api_plan" tier="starter" label="Get API Access" />
        }
      />
      <PlanCard
        name="Developer"
        price="$499"
        billedNote="/mo"
        badge="Most popular"
        features={["2,000,000 API calls/mo", "Higher rate limits", "Priority support", "Advanced analytics"]}
        selected={selected === "developer"}
        onSelect={() => setSelected("developer")}
        action={
          <SubscriptionCheckoutButton kind="api_plan" tier="developer" label="Get API Access" />
        }
      />
      <PlanCard
        name="Business"
        price="$2,500"
        billedNote="/mo"
        features={["15,000,000 API calls/mo", "High rate limits", "Custom alerts", "SLA 99.9%"]}
        selected={selected === "business"}
        onSelect={() => setSelected("business")}
        action={
          <SubscriptionCheckoutButton kind="api_plan" tier="business" label="Get API Access" />
        }
      />
      <PlanCard
        name="Enterprise"
        price="Custom"
        features={["Dedicated entropy pools", "Private endpoints", "SLA 99.99%", "Custom terms"]}
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
