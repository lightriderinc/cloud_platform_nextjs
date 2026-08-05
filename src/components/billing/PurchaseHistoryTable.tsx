"use client";

import { formatUsd } from "@/components/billing/CreditsSummary";
import { useQuery } from "@tanstack/react-query";

export interface PurchaseRow {
  id: string;
  amountCents: number;
  type: "one_time" | "plan_credit";
  createdAt: string;
}

async function fetchPurchases(): Promise<PurchaseRow[]> {
  const res = await fetch("/api/billing/purchases");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.purchases ?? [];
}

const HEADERS = ["Date", "Description", "Amount"];

function PurchaseRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      {Array.from({ length: 3 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-20 rounded bg-gray-100" />
        </td>
      ))}
    </tr>
  );
}

export default function PurchaseHistoryTable() {
  const {
    data: purchases,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["billing", "purchases"],
    queryFn: fetchPurchases,
  });

  if (error) {
    return (
      <p className="mt-5 text-sm text-red-500">
        {error instanceof Error ? error.message : "Failed to load purchase history."}
      </p>
    );
  }

  if (!isLoading && (!purchases || purchases.length === 0)) {
    return (
      <div className="default-radius border border-dashed border-gray-200 bg-gray-50 p-16 text-center mt-5 text-sm text-gray-500">
        Your purchases will appear here once you buy compute tokens.
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto default-radius border border-gray-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            {HEADERS.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2 font-medium text-gray-700">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={isLoading ? "animate-pulse" : undefined}>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <PurchaseRowSkeleton key={i} />)
            : purchases!.map((purchase) => (
                <tr
                  key={purchase.id}
                  className="border-b border-gray-100 bg-white last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {new Date(purchase.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {purchase.type === "plan_credit"
                      ? "Plan credit"
                      : "Compute token purchase"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    ${formatUsd(purchase.amountCents)}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
