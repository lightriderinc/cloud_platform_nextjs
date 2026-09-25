"use client";

import { formatCredits } from "@/components/billing/CreditsSummary";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Sent/received transfer history.
 *
 * Renders entirely from the ledger's own transfer columns — in particular
 * `counterpartyEmailSnapshot`, captured at transfer time — so no live Logto
 * lookup happens here and a counterparty later changing their email never
 * rewrites what a past transfer said.
 */

type TransferRow = {
  id: string;
  transferId: string | null;
  batchId: string | null;
  amountCents: number;
  counterpartyEmail: string | null;
  reason: string;
  createdAt: string;
};

type TransfersPage = {
  view: "sent" | "received";
  page: number;
  pageSize: number;
  hasMore: boolean;
  transfers: TransferRow[];
};

async function fetchTransfers(
  view: "sent" | "received",
  page: number,
): Promise<TransfersPage> {
  const res = await fetch(
    `/api/billing/credits/transfers?view=${view}&page=${page}`,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

const HEADERS = ["Date", "Counterparty", "Type", "Amount"];

function RowSkeleton() {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      {HEADERS.map((h) => (
        <td key={h} className="px-4 py-3">
          <div className="h-4 w-20 rounded bg-gray-100" />
        </td>
      ))}
    </tr>
  );
}

/**
 * "transfer_sent:9f1c…" -> "Transfer sent". Keeps enough of the reason string
 * to tell a transfer apart from other ledger activity if this table is ever
 * reused for a combined ledger view, without showing a raw uuid.
 */
function describeReason(reason: string): string {
  const [prefix] = reason.split(":");
  if (prefix === "transfer_sent") return "Transfer sent";
  if (prefix === "transfer_received") return "Transfer received";
  return prefix.replace(/_/g, " ");
}

export default function TransferHistory() {
  const [view, setView] = useState<"sent" | "received">("sent");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["billing", "transfers", view, page],
    queryFn: () => fetchTransfers(view, page),
    // Keeps the previous page on screen while the next one loads, instead of
    // collapsing the table back to skeletons on every paging click.
    placeholderData: (previous) => previous,
  });

  function switchView(next: "sent" | "received") {
    setView(next);
    setPage(1);
  }

  const transfers = data?.transfers ?? [];

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-gray-100">
        {(["sent", "received"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => switchView(option)}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              view === option
                ? "border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {option === "sent" ? "Sent" : "Received"}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load transfers."}
        </p>
      ) : !isLoading && transfers.length === 0 ? (
        <div className="default-radius border border-dashed border-gray-200 bg-gray-50 p-16 text-center text-sm text-gray-500">
          {view === "sent"
            ? "Credits you send will appear here."
            : "Credits other people send you will appear here."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto default-radius border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-2 font-medium text-gray-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={isLoading ? "animate-pulse" : undefined}>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                  : transfers.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 bg-white last:border-0"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.counterpartyEmail ?? (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                          {describeReason(row.reason)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                          {view === "sent" ? "-" : "+"}
                          {formatCredits(row.amountCents)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="default-radius cursor-pointer border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">Page {page}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data?.hasMore || isFetching}
              className="default-radius cursor-pointer border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
