"use client";

import { useProtectedWork } from "@/lib/auth/protected-work";
import LRButton from "@/components/ui/LRButton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MdAdd, MdClose } from "react-icons/md";

/**
 * Invite people to Light Rider by email.
 *
 * Mirrors ShareCredits: repeating rows, one review step before anything is
 * sent, per-row results afterwards. Invites are lower stakes than money, but
 * they are still irreversible emails to real people and they still burn a
 * capped daily quota — so the same confirm-before-commit pattern applies, and
 * having one pattern for both forms beats having two.
 *
 * Local row state is NEVER derived from, or reset by, the quota query. It
 * changes only on user input and on a successful send. See useProtectedWork
 * below for the other half of that guarantee.
 */

const MAX_ROWS = 15; // matches INVITE_DAILY_LIMIT server-side

type RowResult =
  | { status: "ok"; email: string; expiresAt: string }
  | { status: "already_member"; email: string }
  | { status: "already_invited"; email: string; expiresAt: string }
  | { status: "self_invite"; email: string }
  | { status: "invalid_email"; email: string }
  | { status: "email_failed"; email: string; message: string }
  | { status: "lookup_failed"; email: string; message: string };

type Quota = { usedToday: number; limit: number; remainingToday: number };

type BatchOk = {
  ok: true;
  rows: RowResult[];
  sentCount: number;
  remainingToday: number;
};

type BatchFailure = {
  code: "rate_limited" | "too_many_rows" | "no_rows" | "error";
  message: string;
};

class InviteError extends Error {
  constructor(readonly failure: BatchFailure) {
    super(failure.message);
  }
}

type FormRow = { id: string; email: string };

function blankRow(): FormRow {
  return { id: crypto.randomUUID(), email: "" };
}

async function postInvites(emails: string[]): Promise<BatchOk> {
  const res = await fetch("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const known = ["rate_limited", "too_many_rows", "no_rows"];
    throw new InviteError({
      code: known.includes(data.error) ? data.error : "error",
      message: data.message ?? data.error ?? `HTTP ${res.status}`,
    });
  }

  return data as BatchOk;
}

export default function SendInvite() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<FormRow[]>([blankRow()]);
  const [reviewing, setReviewing] = useState(false);

  // Shares a query key with the history table's "invites" view, so one
  // invalidation refreshes the quota and the list together.
  const quotaQuery = useQuery({
    queryKey: ["invites", "invites", 1],
    queryFn: async (): Promise<{ quota: Quota }> => {
      const res = await fetch("/api/invites?view=invites&page=1");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data;
    },
  });

  const quota = quotaQuery.data?.quota;

  const send = useMutation({
    mutationFn: postInvites,
    onSuccess: () => {
      setRows([blankRow()]);
      setReviewing(false);
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: () => {
      // A partial batch can still have created rows, so the quota and list
      // may have moved even though the request reported failure.
      setReviewing(false);
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  // Deduped case-insensitively, mirroring dedupeEmails() on the server, so the
  // review step shows exactly what will be sent rather than a list the server
  // is about to collapse.
  const payload = (() => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      const email = row.email.trim();
      const key = email.toLowerCase();
      if (key !== "" && !seen.has(key)) seen.set(key, email);
    }
    return [...seen.values()];
  })();

  const remaining = quota?.remainingToday ?? 0;
  const overQuota = quota !== undefined && payload.length > remaining;
  const outOfInvites = quota !== undefined && remaining <= 0;

  const canReview =
    quota !== undefined &&
    payload.length > 0 &&
    !overQuota &&
    !send.isPending;

  // Holds off the silent SSO check, which reloads the whole document. The
  // DOM-level check in protected-work.ts covers the typed rows, but not the
  // review step — that replaces the inputs with a summary, leaving nothing on
  // the page for it to find at the exact moment the state matters most.
  useProtectedWork(payload.length > 0 || reviewing || send.isPending);

  function clearLastResult() {
    if (send.isSuccess || send.isError) send.reset();
    setReviewing(false);
  }

  function updateRow(id: string, email: string) {
    clearLastResult();
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, email } : row)),
    );
  }

  function addRow() {
    clearLastResult();
    setRows((current) =>
      current.length >= MAX_ROWS ? current : [...current, blankRow()],
    );
  }

  function removeRow(id: string) {
    clearLastResult();
    setRows((current) =>
      current.length === 1 ? current : current.filter((row) => row.id !== id),
    );
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!canReview) return;
    setReviewing(true);
  }

  function handleConfirm() {
    if (send.isPending) return;
    send.mutate(payload);
  }

  const failure =
    send.error instanceof InviteError ? send.error.failure : null;

  return (
    <div className="default-radius border border-gray-50 bg-gray-50 p-5">
      <h2 className="text-lg font-bold text-gray-800">Invite people</h2>
      <p className="mb-4 text-sm text-gray-600">
        Send invite links by email. When someone you invited signs up and buys
        credits — or runs their first job on real hardware — you both get 100
        credits.
      </p>

      {quotaQuery.isLoading ? (
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-gray-200" />
      ) : quota ? (
        <p className="mb-4 text-sm text-gray-700">
          <span className="font-medium">
            {quota.remainingToday} of {quota.limit}
          </span>{" "}
          invites left today
        </p>
      ) : null}

      {reviewing ? (
        <ReviewStep
          emails={payload}
          remaining={remaining}
          isPending={send.isPending}
          onConfirm={handleConfirm}
          onCancel={() => setReviewing(false)}
        />
      ) : (
        <form onSubmit={handleReview} className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <div key={row.id} className="flex items-end gap-2">
              <label className="flex-1 text-sm text-gray-600">
                {index === 0 && "Their email"}
                <input
                  type="email"
                  value={row.email}
                  onChange={(e) => updateRow(row.id, e.target.value)}
                  placeholder="friend@example.com"
                  disabled={outOfInvites}
                  className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </label>

              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                aria-label="Remove recipient"
                className="mb-1 default-radius p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <MdClose />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={addRow}
              disabled={rows.length >= MAX_ROWS || outOfInvites}
              className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-gray-700 transition-colors hover:text-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MdAdd /> Add another
            </button>
            <span className="text-xs text-gray-500">
              {payload.length} {payload.length === 1 ? "invite" : "invites"}
            </span>
          </div>

          {overQuota && (
            <p className="text-xs text-red-600">
              That&apos;s {payload.length} invites but you only have {remaining}{" "}
              left today.
            </p>
          )}

          <LRButton
            variant="primary"
            type="submit"
            disabled={!canReview}
            className="w-full"
          >
            Review and send
          </LRButton>

          {outOfInvites && (
            <p className="text-xs text-gray-600">
              You&apos;ve reached today&apos;s invite limit, try again tomorrow.
            </p>
          )}
        </form>
      )}

      {send.isSuccess && send.data && (
        <p className="mt-3 text-sm text-green-700">
          {send.data.sentCount > 0
            ? `Sent ${send.data.sentCount} ${send.data.sentCount === 1 ? "invite" : "invites"}. ${send.data.remainingToday} left today.`
            : "No new invites were sent — see below."}
        </p>
      )}

      {failure && <p className="mt-3 text-sm text-red-600">{failure.message}</p>}

      {send.data?.rows && send.data.rows.length > 0 && (
        <RowResults rows={send.data.rows} />
      )}
    </div>
  );
}

/**
 * Invites can't be unsent and the daily quota is small, so the list is read
 * back before anything goes out — the same step Share Credits uses.
 */
function ReviewStep({
  emails,
  remaining,
  isPending,
  onConfirm,
  onCancel,
}: {
  emails: string[];
  remaining: number;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="default-radius border border-amber-200 bg-amber-50 p-4">
      <p className="mb-3 text-sm font-medium text-amber-900">
        Send {emails.length} {emails.length === 1 ? "invite" : "invites"}?
        They&apos;ll go out straight away.
      </p>

      <ul className="mb-3 divide-y divide-amber-200 border-y border-amber-200">
        {emails.map((email) => (
          <li key={email} className="truncate py-2 text-sm text-gray-800">
            {email}
          </li>
        ))}
      </ul>

      <p className="mb-4 text-xs text-gray-600">
        You&apos;ll have {Math.max(0, remaining - emails.length)} invites left
        today.
      </p>

      <div className="flex gap-2">
        <LRButton
          variant="primary"
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? "Sending…" : "Send invites"}
        </LRButton>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="default-radius cursor-pointer border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
      </div>
    </div>
  );
}

/** Per-row outcomes, so one bad address never hides what happened to the rest. */
function RowResults({ rows }: { rows: RowResult[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {rows.map((row, i) => {
        if (row.status === "ok") {
          return (
            <li key={i} className="text-sm text-green-700">
              Invite sent to {row.email}.
            </li>
          );
        }

        if (row.status === "already_member") {
          return (
            <li key={i} className="text-sm text-gray-700">
              {row.email} already has an account — no invite sent, and it
              didn&apos;t use one of today&apos;s.
            </li>
          );
        }

        if (row.status === "already_invited") {
          return (
            <li key={i} className="text-sm text-gray-700">
              {row.email} already has an invite pending until{" "}
              {new Date(row.expiresAt).toLocaleDateString()} — not sent again.
            </li>
          );
        }

        if (row.status === "self_invite") {
          return (
            <li key={i} className="text-sm text-red-600">
              {row.email} is your own address — you already have an account.
            </li>
          );
        }

        if (row.status === "invalid_email") {
          return (
            <li key={i} className="text-sm text-red-600">
              {row.email} isn&apos;t a valid email address.
            </li>
          );
        }

        return (
          <li key={i} className="text-sm text-red-600">
            {row.email}: {row.message}
          </li>
        );
      })}
    </ul>
  );
}
