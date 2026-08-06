import SubscriptionsList from "@/components/billing/SubscriptionsList";
import UsageSummary from "@/components/billing/UsageSummary";
import { ValidationCheckoutButton } from "@/components/billing/ValidationCheckoutButton";

export default function BillingPage() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div>
      <div className="mt-6">
        <UsageSummary />
      </div>
      {isDev && (
        <div className="mt-6">
          <ValidationCheckoutButton />
        </div>
      )}
      <div className="mt-6">
        <SubscriptionsList />
      </div>
    </div>
  );
}
