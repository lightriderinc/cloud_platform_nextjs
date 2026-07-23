import { ManageBillingButton } from "@/components/billing/CheckoutButtons";
import UserPlansGrid from "@/components/billing/UserPlansGrid";
import InfoBox from "@/components/InfoBox";

export default function UserPricingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">User Pricing</h1>
      <p className="mb-6 text-sm text-gray-600">
        Monthly platform plans for teams and individuals. Quantum runtime and
        API usage are billed separately when used.
      </p>

      <InfoBox>
        Compute seconds and EaaS API usage are billed separately from your
        plan. See Quantum Compute and API Pricing for those rates.
      </InfoBox>

      <div className="mt-6">
        <UserPlansGrid />
      </div>

      <div className="mt-8 flex items-center gap-3 default-radius border border-gray-200 bg-gray-50 p-4">
        <p className="flex-1 text-sm text-gray-600">
          Already on a plan? Update your payment method, view invoices, or
          change plans in the billing portal.
        </p>
        <ManageBillingButton />
      </div>
    </div>
  );
}
