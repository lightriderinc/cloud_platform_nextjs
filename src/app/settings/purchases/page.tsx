import PricingNavCard from "@/components/pricing/PricingNavCard";
import { GiProcessor } from "react-icons/gi";
import { PiUserFocusFill } from "react-icons/pi";

const PRICING_PAGES = [
  {
    href: "/settings/purchases/quantum-compute",
    name: "Quantum Compute",
    description:
      "Pay for quantum runtime by the second when your applications or workflows use quantum resources.",
  },
  {
    href: "/settings/purchases/user-plans",
    name: "User Plans",
    description:
      "Monthly platform access for teams and individuals, with credits included.",
  },
  // Hidden for V2 (two-tier Basic/Pro simplification) — the /settings/purchases/api
  // and /settings/purchases/enterprise routes/pages are untouched, just not linked
  // from here for now. Uncomment to bring them back.
  // {
  //   href: "/settings/purchases/api",
  //   name: "API Pricing",
  //   description: "Usage-based pricing for Entropy-as-a-Service (EaaS) API calls.",
  // },
  // {
  //   href: "/settings/purchases/enterprise",
  //   name: "Enterprise & Government",
  //   description: "Custom deployments, security, and SLAs for large organizations.",
  // },
];

export default function PricingOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Purchases</h1>
      <p className="mb-12 text-sm text-gray-600">
        Light Rider purchases are modular. <br /> Start with quantum compute
        credits, manage platform access, then scale into quantum runtime, APIs,
        and enterprise services as you grow.
      </p>

      <div className="flex flex-col lg:flex-row gap-3">
        <PricingNavCard
          href="/settings/purchases/quantum-compute"
          title="Quantum Compute"
          description="Pay for quantum runtime by the second when your applications or workflows use quantum resources."
          icon={GiProcessor}
        />
        <PricingNavCard
          href="/settings/purchases/user-plans"
          title="User Plans"
          description="Monthly platform access for teams and individuals, with credits included."
          icon={PiUserFocusFill}
        />
      </div>
    </div>
  );
}
