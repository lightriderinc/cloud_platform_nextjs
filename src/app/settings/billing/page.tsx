import SubscriptionsList from "@/components/billing/SubscriptionsList";
import UsageSummary from "@/components/billing/UsageSummary";
import { ValidationCheckoutButton } from "@/components/billing/ValidationCheckoutButton";

export const metadata = {
  title: "Billing | Light Rider Quantum",
};

export default function BillingPage() {
  return (
    <div>
      <div className="mt-6">
        <UsageSummary />
      </div>
      <div className="mt-6">
        <ValidationCheckoutButton />
      </div>
      <div className="mt-6">
        <SubscriptionsList />
      </div>
    </div>
  );
}
