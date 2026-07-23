import CreditsSummary from "@/components/billing/CreditsSummary";
import PaymentMethodCard from "@/components/billing/PaymentMethodCard";
import SubscriptionsList from "@/components/billing/SubscriptionsList";
import { ProRoleToggle } from "@/components/dev/ProRoleToggle";

export default function PaymentPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">
        Payment & Subscription
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Manage your subscription and payment details.
      </p>

      <div className="flex flex-col gap-4">
        <SubscriptionsList />
        <CreditsSummary />
        <PaymentMethodCard />
      </div>

      <ProRoleToggle />
    </div>
  );
}
