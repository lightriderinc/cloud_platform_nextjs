import PagePlaceholder from "@/components/PagePlaceholder";
import SubscriptionsList from "@/components/billing/SubscriptionsList";
import { ValidationCheckoutButton } from "@/components/billing/ValidationCheckoutButton";

export default function BillingPage() {
  return (
    <div>
      <PagePlaceholder
        title="Billing & Usage"
        description="Credits, consumption, and invoices."
      />
      <div className="mt-6">
        <ValidationCheckoutButton />
      </div>
      <div className="mt-6">
        <SubscriptionsList />
      </div>
    </div>
  );
}
