import Link from "next/link";
import { MdArrowForward } from "react-icons/md";

const PRICING_PAGES = [
  {
    href: "/pricing/quantum-compute",
    name: "Quantum Compute",
    description: "Pay for quantum runtime by the second when your applications or workflows use quantum resources.",
  },
  {
    href: "/pricing/user-plans",
    name: "User Plans",
    description: "Monthly platform access for teams and individuals, with credits included.",
  },
  {
    href: "/pricing/api",
    name: "API Pricing",
    description: "Usage-based pricing for Entropy-as-a-Service (EaaS) API calls.",
  },
  {
    href: "/pricing/enterprise",
    name: "Enterprise & Government",
    description: "Custom deployments, security, and SLAs for large organizations.",
  },
];

export default function PricingOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Pricing</h1>
      <p className="mb-6 text-sm text-gray-600">
        Light Rider pricing is modular. Start with platform access, then
        scale into quantum runtime, APIs, and enterprise services as you
        grow.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PRICING_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="card-hover-primary flex flex-col gap-2 default-radius border border-gray-200 bg-gray-100 p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-l font-bold text-gray-800">{page.name}</h2>
              <MdArrowForward className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
