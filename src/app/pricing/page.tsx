import PricingNavCard from "@/components/pricing/PricingNavCard";
import { GiProcessor } from "react-icons/gi";
import { PiUserFocusFill } from "react-icons/pi";

const PRICING_PAGES = [
  {
    href: "/pricing/quantum-compute",
    name: "Quantum Compute",
    description:
      "Pay for quantum runtime by the second when your applications or workflows use quantum resources.",
  },
  {
    href: "/pricing/user-plans",
    name: "User Plans",
    description:
      "Monthly platform access for teams and individuals, with credits included.",
  },
  // Hidden for V2 (two-tier Basic/Pro simplification) — the /pricing/api and
  // /pricing/enterprise routes/pages are untouched, just not linked from
  // here for now. Uncomment to bring them back.
  // {
  //   href: "/pricing/api",
  //   name: "API Pricing",
  //   description: "Usage-based pricing for Entropy-as-a-Service (EaaS) API calls.",
  // },
  // {
  //   href: "/pricing/enterprise",
  //   name: "Enterprise & Government",
  //   description: "Custom deployments, security, and SLAs for large organizations.",
  // },
];

export default function PricingOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Pricing</h1>
      <p className="mb-12 text-sm text-gray-600">
        Light Rider pricing is modular. Start with platform access, then scale
        into quantum runtime, APIs, and enterprise services as you grow.
      </p>

      <div className="flex flex-row gap-3">
        <PricingNavCard
          href="/pricing/quantum-compute"
          title="Quantum Compute"
          description="Pay for quantum runtime by the second when your applications or workflows use quantum resources."
          icon={GiProcessor}
        />
        <PricingNavCard
          href="/pricing/user-plans"
          title="User Plans"
          description="Monthly platform access for teams and individuals, with credits included."
          icon={PiUserFocusFill}
        />
      </div>
    </div>
  );
}
