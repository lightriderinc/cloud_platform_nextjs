import CreditsSummary from "@/components/billing/CreditsSummary";
import PaymentMethodCard from "@/components/billing/PaymentMethodCard";
import PurchaseHistoryTable from "@/components/billing/PurchaseHistoryTable";
import SubscriptionsList from "@/components/billing/SubscriptionsList";
import { ProRoleToggle } from "@/components/dev/ProRoleToggle";

export default function PaymentPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">
        Usage
      </h1>
      <p className="mb-12 text-sm text-gray-600">
        Manage your tokens, subscriptions, and payment details.
      </p>

      <div className="flex flex-col gap-4">
        <SubscriptionsList />
        <CreditsSummary />
        <PaymentMethodCard />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-xl font-bold text-gray-600">
          Purchase history
        </h2>
        <PurchaseHistoryTable />
      </div>

      <ProRoleToggle />
    </div>
  );
}
