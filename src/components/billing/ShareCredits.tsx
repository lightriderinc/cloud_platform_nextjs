"use client";

import {
  fetchJson,
  formatCredits,
  type Credits,
} from "@/components/billing/CreditsSummary";
import LRButton from "@/components/ui/LRButton";
import { useProtectedWork } from "@/lib/auth/protected-work";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MdAdd, MdClose } from "react-icons/md";
import WarningBox from "../WarningBox";

/**
 * Send credits to one or more Light Rider users by email.
 *
 * Transfers are final there's no pending/accept step and no way to pull them
 * back, so the submit goes through an explicit review step listing every
 * recipient and the total before anything is sent. A misclick must not be able
 * to pay five people.
 *
 * Amounts are entered as whole credits; the API takes whole credits too and
 * converts at its own boundary (see lib/billing/transferCredits.ts), so
 * nothing here multiplies or divides. The live balance comes from the same
 * ["billing", "credits"] query CreditsSummary uses, so a successful send
 * refreshes every credit display on the page at once.
 */

const MAX_ROWS = 20;

type RowResult =
  | { status: "ok"; email: string; amountCents: number; recipientEmail: string }
  | { status: "recipient_not_found"; email: string; amountCents: number }
  | { status: "self_transfer"; email: string; amountCents: number }
  | {
      status: "invalid_amount";
      email: string;
      amountCents: number;
      message: string;
    }
  | {
      status: "lookup_failed";
      email: string;
      amountCents: number;
      message: string;
    };

type BatchOk = {
  ok: true;
  batchId: string;
  rows: RowResult[];
  totalSentCents: number;
  senderBalanceCents: number;
  replayed: boolean;
};

type BatchFailure = {
  code: "insufficient_balance" | "no_valid_rows" | "too_many_rows" | "error";
  message: string;
  rows?: RowResult[];
};

class BatchError extends Error {
  constructor(readonly failure: BatchFailure) {
    super(failure.message);
  }
}

type FormRow = { id: string; email: string; amount: string };

function blankRow(): FormRow {
  return { id: crypto.randomUUID(), email: "", amount: "" };
}

async function postBatch(input: {
  rows: { email: string; credits: number }[];
  idempotencyKey: string;
}): Promise<BatchOk> {
  const res = await fetch("/api/billing/credits/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const known = ["insufficient_balance", "no_valid_rows", "too_many_rows"];
    throw new BatchError({
      code: known.includes(data.error) ? data.error : "error",
      message: data.message ?? data.error ?? `HTTP ${res.status}`,
      rows: data.rows,
    });
  }

  return data as BatchOk;
}

export default function ShareCredits() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<FormRow[]>([blankRow()]);
  // Set when the user asks to send; cleared on edit or completion. Doubles as
  // the idempotency key, so the key is fixed at review time and a double-click
  // on the confirm button reuses it rather than minting a second one.
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const credits = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
  });

  const balanceCents = credits.data?.remainingCents ?? 0;

  const send = useMutation({
    mutationFn: postBatch,
    onSuccess: () => {
      setRows([blankRow()]);
      setPendingKey(null);
      queryClient.invalidateQueries({ queryKey: ["billing", "credits"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "transfers"] });
    },
    onError: () => setPendingKey(null),
  });

  const parsed = rows.map((row) => ({
    ...row,
    credits: row.amount === "" ? null : Number(row.amount),
  }));

  const filled = parsed.filter(
    (row) => row.email.trim() !== "" && row.credits !== null && row.credits > 0,
  );
  const totalCents = filled.reduce((sum, row) => sum + (row.credits ?? 0), 0);
  const isOverBalance = totalCents > balanceCents;

  const canReview =
    credits.isSuccess &&
    filled.length > 0 &&
    filled.length === rows.filter((r) => r.email.trim() !== "").length &&
    !isOverBalance &&
    !send.isPending;

  function clearLastResult() {
    if (send.isSuccess || send.isError) send.reset();
    setPendingKey(null);
  }

  function updateRow(id: string, patch: Partial<FormRow>) {
    clearLastResult();
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function handleAmountChange(id: string, value: string) {
    if (value !== "" && !/^\d+$/.test(value)) return;
    updateRow(id, { amount: value });
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
    setPendingKey(crypto.randomUUID());
  }

  // Mirrors dedupeRows() on the server so the review step shows exactly what
  // will happen. Without it, entering one address twice would list two rows in
  // the confirmation and then merge server-side — a review that doesn't match
  // the outcome is worse than no review. (It also kept React keys unique.)
  const payload = (() => {
    const merged = new Map<string, { email: string; credits: number }>();
    for (const row of filled) {
      const email = row.email.trim();
      const key = email.toLowerCase();
      const existing = merged.get(key);
      if (existing) existing.credits += row.credits as number;
      else merged.set(key, { email, credits: row.credits as number });
    }
    return [...merged.values()];
  })();

  function handleConfirm() {
    if (!pendingKey || send.isPending) return;
    send.mutate({ rows: payload, idempotencyKey: pendingKey });
  }

  const failure = send.error instanceof BatchError ? send.error.failure : null;
  const resultRows = send.data?.rows ?? failure?.rows;

  // Hold off the silent SSO check (which reloads the whole document) while
  // there is a batch in progress. hasUnsavedInput() already covers the typed
  // rows, but not the review step — that replaces the inputs with a summary,
  // so there is nothing left in the DOM to detect while the riskiest state is
  // on screen.
  useProtectedWork(payload.length > 0 || pendingKey !== null || send.isPending);

  return (
    <div className="default-radius border border-gray-50 bg-gray-50 p-5">
      <h2 className="text-lg font-bold text-gray-800">Send credits</h2>
      <p className="mb-4 text-sm text-gray-600">
        Send credits to other Light Rider users by email.
      </p>

      {credits.isLoading ? (
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className="mb-4 text-sm text-gray-700">
          Available balance:{" "}
          <span className="font-medium">
            {formatCredits(balanceCents)} credits
          </span>
        </p>
      )}

      {pendingKey ? (
        <ReviewStep
          rows={payload}
          totalCents={totalCents}
          balanceCents={balanceCents}
          isPending={send.isPending}
          onConfirm={handleConfirm}
          onCancel={() => setPendingKey(null)}
        />
      ) : (
        <form onSubmit={handleReview} className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <div key={row.id} className="flex items-end gap-2">
              <label className="flex-1 text-sm text-gray-600">
                {index === 0 && "Recipient email"}
                <input
                  type="email"
                  value={row.email}
                  onChange={(e) => updateRow(row.id, { email: e.target.value })}
                  placeholder="teammate@example.com"
                  className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="w-40 text-sm text-gray-600">
                {index === 0 && "Credits"}
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={row.amount}
                  onChange={(e) => handleAmountChange(row.id, e.target.value)}
                  placeholder="500"
                  className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm"
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
              disabled={rows.length >= MAX_ROWS}
              className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-gray-700 transition-colors hover:text-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MdAdd /> Add recipient
            </button>
            <span className="text-xs text-gray-500">
              {rows.length} of {MAX_ROWS}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-4 pb-1">
            <span className="text-sm text-gray-600">Total</span>
            <span
              className={`font-medium text-md ${isOverBalance ? "text-red-600" : "text-gray-800"}`}
            >
              {formatCredits(totalCents)} credits
            </span>
          </div>

          {isOverBalance && (
            <p className="text-xs text-red-600">
              That&apos;s {formatCredits(totalCents - balanceCents)} more than
              your balance of {formatCredits(balanceCents)} credits.
            </p>
          )}

          <div>
            <WarningBox>Transfers can not be cancelled or reversed.</WarningBox>
          </div>

          <LRButton
            variant="primary"
            type="submit"
            disabled={!canReview}
            className="w-full"
          >
            Review and send
          </LRButton>
        </form>
      )}

      {send.isSuccess && send.data && (
        <p className="mt-3 text-sm text-green-700">
          {send.data.replayed
            ? "This batch was already sent. Nothing was sent twice."
            : `Sent ${formatCredits(send.data.totalSentCents)} credits. Your new balance is ${formatCredits(send.data.senderBalanceCents)} credits.`}
        </p>
      )}

      {failure && (
        <p className="mt-3 text-sm text-red-600">{failure.message}</p>
      )}

      {resultRows && resultRows.length > 0 && <RowResults rows={resultRows} />}
    </div>
  );
}

/**
 * The step between "I filled in a form" and "money moved". Shows exactly what
 * is about to happen — every recipient, every amount, the total — because
 * none of it can be undone afterwards.
 */
function ReviewStep({
  rows,
  totalCents,
  balanceCents,
  isPending,
  onConfirm,
  onCancel,
}: {
  rows: { email: string; credits: number }[];
  totalCents: number;
  balanceCents: number;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="default-radius border border-amber-200 bg-amber-50 p-4">
      <p className="mb-3 text-sm font-medium text-amber-900">
        Confirm this transfer. It can&apos;t be undone.
      </p>

      <ul className="mb-3 divide-y divide-amber-200 border-y border-amber-200">
        {rows.map((row) => (
          <li
            key={row.email}
            className="flex items-center justify-between gap-4 py-2 text-sm"
          >
            <span className="truncate text-gray-800">{row.email}</span>
            <span className="whitespace-nowrap font-medium text-gray-800">
              {formatCredits(row.credits)} credits
            </span>
          </li>
        ))}
      </ul>

      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-gray-700">
          Total to {rows.length} recipient{rows.length === 1 ? "" : "s"}
        </span>
        <span className="font-bold text-gray-900">
          {formatCredits(totalCents)} credits
        </span>
      </div>
      <p className="mb-4 text-xs text-gray-600">
        Your balance after this: {formatCredits(balanceCents - totalCents)}{" "}
        credits.
      </p>

      <div className="flex gap-2">
        <LRButton
          variant="primary"
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1"
        >
          {isPending
            ? "Sending..."
            : `Send ${formatCredits(totalCents)} credits`}
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
              Sent {formatCredits(row.amountCents)} credits to{" "}
              {row.recipientEmail || row.email}.
            </li>
          );
        }

        if (row.status === "recipient_not_found") {
          return (
            <li
              key={i}
              className="default-radius border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
            >
              {row.email} doesn&apos;t have an account yet. Invite them instead.
              {/*
                TODO(Send Invite): render the invite affordance
                here, prefilled with `row.email`. Deliberately not wired up in
                this change; the invite flow is a separate task.
              */}
            </li>
          );
        }

        if (row.status === "self_transfer") {
          return (
            <li key={i} className="text-sm text-red-600">
              {row.email} is your own address. You can&apos;t send credits to
              yourself.
            </li>
          );
        }

        return (
          <li key={i} className="text-sm text-red-600">
            {row.email || "This row"}: {row.message}
          </li>
        );
      })}
    </ul>
  );
}
