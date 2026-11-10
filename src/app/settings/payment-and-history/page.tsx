import PaymentMethodCard from "@/components/billing/PaymentMethodCard";
import PurchaseHistoryTable from "@/components/billing/PurchaseHistoryTable";

export const metadata = {
  title: "Payment & History | Light Rider Quantum",
};

export default function PaymentAndHistoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Payment &amp; History</h1>
      <p className="mb-12 text-sm text-gray-600">Manage payment methods and view your purchase history.</p>
      <div className="flex flex-col gap-4">
        <PaymentMethodCard />
        <PurchaseHistoryTable />
      </div>
    </div>
  );
}
