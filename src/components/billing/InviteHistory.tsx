"use client";

import { formatCredits } from "@/components/billing/CreditsSummary";
import TablePagination from "@/components/ui/TablePagination";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Invites sent, and rewards earned from them.
 *
 * Same structure as TransferHistory: a two-option toggle, `?view=&page=`
 * paging with `hasMore` from an extra fetched row, and `placeholderData` so
 * paging doesn't collapse the table back to skeletons.
 */

type InviteRow = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt: string;
  rewardCents: number | null;
};

type RewardRow = {
  id: string;
  /** Which side of the referral this customer was on. */
  side: "referrer" | "referee";
  /** The person you invited, or the person who invited you. */
  counterpartyEmail: string | null;
  rewardCents: number | null;
  qualifyingEventReason: string | null;
  rewardedAt: string | null;
  reason: string;
};

type InvitesPage = {
  view: "invites" | "rewards";
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  invites?: InviteRow[];
  rewards?: RewardRow[];
};

async function fetchInvites(
  view: "invites" | "rewards",
  page: number,
): Promise<InvitesPage> {
  const res = await fetch(`/api/invites?view=${view}&page=${page}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

const INVITE_HEADERS = ["Sent", "Invitee", "Status", "Reward"];
const REWARD_HEADERS = ["Rewarded", "Referral", "Earned by", "Amount"];

function StatusBadge({ status }: { status: InviteRow["status"] }) {
  const styles = {
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-400",
    pending: "bg-amber-50 text-amber-800 border-amber-400",
    expired: "bg-gray-100 text-gray-500 border-gray-200",
  } as const;

  return (
    <span
      className={`rounded border capitalize px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

/** "first_qpu_job" -> "First quantum job". */
function describeQualifyingEvent(reason: string | null): string {
  if (reason === "first_qpu_job") return "First quantum job";
  if (reason === "first_purchase") return "First purchase";
  return reason ?? "Not recorded";
}

export default function InviteHistory() {
  const [view, setView] = useState<"invites" | "rewards">("invites");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["invites", view, page],
    queryFn: () => fetchInvites(view, page),
    placeholderData: (previous) => previous,
  });

  function switchView(next: "invites" | "rewards") {
    setView(next);
    setPage(1);
  }

  const headers = view === "invites" ? INVITE_HEADERS : REWARD_HEADERS;
  const rows = view === "invites" ? (data?.invites ?? []) : (data?.rewards ?? []);

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-gray-100">
        {(["invites", "rewards"] as const).map((option) => (
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
            {option === "invites" ? "Invites" : "Rewards earned"}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load invites."}
        </p>
      ) : !isLoading && rows.length === 0 ? (
        <div className="default-radius border border-dashed border-gray-200 bg-gray-50 p-16 text-center text-sm text-gray-500">
          {view === "invites"
            ? "Invites you send will appear here."
            : "Rewards appear here for people you invite, and for the invite that brought you to Light Rider."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto default-radius border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {headers.map((h) => (
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
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      {headers.map((h) => (
                        <td key={h} className="px-4 py-3">
                          <div className="h-4 w-20 rounded bg-gray-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : view === "invites" ? (
                  (rows as InviteRow[]).map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 bg-white last:border-0"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.email}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                        {row.rewardCents ? (
                          `+${formatCredits(row.rewardCents)}`
                        ) : (
                          <span className="text-gray-400">None yet</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  (rows as RewardRow[]).map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 bg-white last:border-0"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {row.rewardedAt
                          ? new Date(row.rewardedAt).toLocaleDateString()
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.counterpartyEmail ? (
                          <>
                            <span className="text-gray-500">
                              {row.side === "referrer"
                                ? "You invited "
                                : "Invited by "}
                            </span>
                            {row.counterpartyEmail}
                          </>
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {describeQualifyingEvent(row.qualifyingEventReason)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                        +{formatCredits(row.rewardCents ?? 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <TablePagination
              page={page}
              pageSize={data.pageSize}
              total={data.total}
              itemLabel={view === "invites" ? "invites" : "rewards"}
              onPageChange={setPage}
              disabled={isFetching}
            />
          )}
        </>
      )}
    </div>
  );
}
