import PurchaseHistoryTable from "@/components/billing/PurchaseHistoryTable";

export default function PurchaseHistoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Purchase History</h1>
      <p className="mb-12 text-sm text-gray-600">View your purchase history.</p>
      <div>
        <PurchaseHistoryTable />
      </div>
    </div>
  );
}
