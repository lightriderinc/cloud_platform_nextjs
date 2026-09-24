import PaymentMethodCard from "@/components/billing/PaymentMethodCard";
import PurchaseHistoryTable from "@/components/billing/PurchaseHistoryTable";

export default function PurchaseHistoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Purchase History</h1>
      <p className="mb-12 text-sm text-gray-600">Manage payment methods and view your purchase history.</p>
      <div className="flex flex-col gap-4">
        <PaymentMethodCard />
        <PurchaseHistoryTable />
      </div>
    </div>
  );
}
