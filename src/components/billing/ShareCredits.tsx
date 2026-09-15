"use client";

import {
  fetchJson,
  formatCredits,
  type Credits,
} from "@/components/billing/CreditsSummary";
import LRButton from "@/components/ui/LRButton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Send credits to another Light Rider user by email.
 *
 * Transfers are final — there's no pending/accept step and no way to pull
 * them back, which the copy says out loud before the button is pressed.
 *
 * Amounts are entered as whole credits; the API takes whole credits too and
 * converts at its own boundary (see lib/billing/transferCredits.ts), so
 * nothing here multiplies or divides. The live balance below comes from the
 * same ["billing", "credits"] query CreditsSummary uses, so a successful send
 * refreshes every credit display on the page at once.
 */

type TransferOk = {
  ok: true;
  transferId: string;
  amountCents: number;
  senderBalanceCents: number;
  recipientEmail: string;
};

/** An expected, non-exceptional outcome carried out of the mutation. */
type TransferFailure = {
  code: "insufficient_balance" | "recipient_not_found" | "error";
  message: string;
  email?: string;
};

class TransferError extends Error {
  constructor(readonly failure: TransferFailure) {
    super(failure.message);
  }
}

async function postTransfer(input: {
  email: string;
  credits: number;
}): Promise<TransferOk> {
  const res = await fetch("/api/billing/credits/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new TransferError({
      code:
        data.error === "insufficient_balance" ||
        data.error === "recipient_not_found"
          ? data.error
          : "error",
      message: data.message ?? data.error ?? `HTTP ${res.status}`,
      email: data.email,
    });
  }

  return data as TransferOk;
}

export default function ShareCredits() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");

  const credits = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
  });

  const balanceCents = credits.data?.remainingCents ?? 0;

  const send = useMutation({
    mutationFn: postTransfer,
    onSuccess: () => {
      setEmail("");
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["billing", "credits"] });
    },
  });

  const parsedAmount = amount === "" ? null : Number(amount);
  const isOverBalance = parsedAmount !== null && parsedAmount > balanceCents;
  const isValidAmount =
    parsedAmount !== null &&
    Number.isInteger(parsedAmount) &&
    parsedAmount > 0 &&
    !isOverBalance;

  // Balance still loading counts as "can't submit yet" — without it we'd be
  // comparing the amount against a placeholder 0 and disabling everything.
  const canSubmit =
    credits.isSuccess && email.trim() !== "" && isValidAmount && !send.isPending;

  // Any edit clears the previous attempt's result, so a stale "Sent 500
  // credits" or error line can never sit above a form the user has already
  // started retyping.
  function clearLastResult() {
    if (send.isSuccess || send.isError) send.reset();
  }

  function handleEmailChange(value: string) {
    clearLastResult();
    setEmail(value);
  }

  function handleAmountChange(value: string) {
    if (value !== "" && !/^\d+$/.test(value)) return;
    clearLastResult();
    setAmount(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    send.mutate({ email: email.trim(), credits: Number(amount) });
  }

  const failure =
    send.error instanceof TransferError ? send.error.failure : null;
  const unexpectedError = send.error && !failure ? send.error : null;

  return (
    <div className="default-radius border border-gray-50 bg-gray-50 p-5">
      <h2 className="text-lg font-bold text-gray-800">Share credits</h2>
      <p className="mb-4 text-sm text-gray-600">
        Send credits to another Light Rider user by email. Transfers are
        immediate and final — they can&apos;t be cancelled or reversed.
      </p>

      {credits.isLoading ? (
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className="mb-4 text-sm text-gray-700">
          Your balance:{" "}
          <span className="font-medium">
            {formatCredits(balanceCents)} credits
          </span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-gray-600">
          Recipient email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="teammate@example.com"
            className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-gray-600">
          Amount (credits)
          <input
            type="number"
            min={1}
            max={balanceCents}
            step={1}
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="e.g. 500"
            className={`mt-1 w-full default-radius border px-3 py-2 text-sm ${
              isOverBalance ? "border-red-400" : "border-gray-300"
            }`}
          />
        </label>

        <p
          className={`text-xs ${isOverBalance ? "text-red-600" : "text-gray-500"}`}
        >
          {isOverBalance
            ? `You only have ${formatCredits(balanceCents)} credits.`
            : `You can send up to ${formatCredits(balanceCents)} credits.`}
        </p>

        <LRButton
          variant="primary"
          type="submit"
          disabled={!canSubmit}
          className="w-full"
        >
          {send.isPending
            ? "Sending…"
            : parsedAmount && !isOverBalance
              ? `Send ${formatCredits(parsedAmount)} credits`
              : "Send credits"}
        </LRButton>

        {send.isSuccess && send.data && (
          <p className="text-sm text-green-700">
            Sent {formatCredits(send.data.amountCents)} credits to{" "}
            {send.data.recipientEmail}. Your new balance is{" "}
            {formatCredits(send.data.senderBalanceCents)} credits.
          </p>
        )}

        {failure?.code === "recipient_not_found" && (
          <div className="default-radius border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              This user doesn&apos;t have an account yet — invite them instead.
            </p>
            {/*
              TODO(Feature 2 — Send Invite): render the invite affordance here,
              prefilled with `failure.email`. Deliberately not wired up in this
              change; the invite flow is a separate task.
            */}
          </div>
        )}

        {failure && failure.code !== "recipient_not_found" && (
          <p className="text-xs text-red-600">{failure.message}</p>
        )}

        {unexpectedError && (
          <p className="text-xs text-red-600">
            Something went wrong — please try again.
          </p>
        )}
      </form>
    </div>
  );
}
