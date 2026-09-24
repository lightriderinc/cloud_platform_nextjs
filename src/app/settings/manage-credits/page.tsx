import CreditsSummary from "@/components/billing/CreditsSummary";
import PricingNavCard from "@/components/pricing/PricingNavCard";
import { LuHandCoins } from "react-icons/lu";
import { PiCoinsFill } from "react-icons/pi";

const PRICING_PAGES = [
  {
    href: "/settings/manage-credits/quantum-compute",
    name: "Quantum Compute",
    description:
      "Pay for quantum runtime by the second when your applications or workflows use quantum resources.",
  },
  {
    href: "/settings/manage-credits/user-plans",
    name: "User Plans",
    description:
      "Monthly platform access for teams and individuals, with credits included.",
  },
  // Hidden for V2 (two-tier Basic/Pro simplification) — the /settings/manage-credits/api
  // and /settings/manage-credits/enterprise routes/pages are untouched, just not linked
  // from here for now. Uncomment to bring them back.
  // {
  //   href: "/settings/manage-credits/api",
  //   name: "API Pricing",
  //   description: "Usage-based pricing for Entropy-as-a-Service (EaaS) API calls.",
  // },
  // {
  //   href: "/settings/manage-credits/enterprise",
  //   name: "Enterprise & Government",
  //   description: "Custom deployments, security, and SLAs for large organizations.",
  // },
];

export default function PricingOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Manage Credits</h1>
      <p className="mb-12 text-sm text-gray-600">
        Manage your credit balance or send credits to other Light Rider users.
      </p>
      <div className="mb-8">
        <CreditsSummary />
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <PricingNavCard
          href="/settings/manage-credits/quantum-compute"
          title="Purchase credits"
          description="Purchase credits to pay for quantum resources."
          icon={PiCoinsFill}
        />
        <PricingNavCard
          href="settings/share-credits"
          title="Share credits"
          description="Send credits to other Light Rider users."
          icon={LuHandCoins}
        />

        {/* <PricingNavCard
          href="/settings/manage-credits/user-plans"
          title="User Plans"
          description="Monthly platform access for teams and individuals, with credits included."
          icon={PiUserFocusFill}
        /> */}
      </div>
    </div>
  );
}
