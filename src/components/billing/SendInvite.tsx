"use client";

import LRButton from "@/components/ui/LRButton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Invite someone to Light Rider by email.
 *
 * Follows the same shape as ShareCredits: a plain form, inline status text,
 * no toast layer (the app has none), and the live quota fetched from the same
 * endpoint the history table uses so both stay consistent.
 */

type Quota = { usedToday: number; limit: number; remainingToday: number };

type InviteOk = {
  ok: true;
  email: string;
  expiresAt: string;
  remainingToday: number;
};

type InviteFailure = {
  code:
    | "already_member"
    | "rate_limited"
    | "self_invite"
    | "invalid_email"
    | "email_failed"
    | "error";
  message: string;
};

class InviteError extends Error {
  constructor(readonly failure: InviteFailure) {
    super(failure.message);
  }
}

const KNOWN_CODES = [
  "already_member",
  "rate_limited",
  "self_invite",
  "invalid_email",
  "email_failed",
];

async function postInvite(email: string): Promise<InviteOk> {
  const res = await fetch("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new InviteError({
      code: KNOWN_CODES.includes(data.error) ? data.error : "error",
      message: data.message ?? data.error ?? `HTTP ${res.status}`,
    });
  }

  return data as InviteOk;
}

export default function SendInvite() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  // Shares a query key with the history table's "invites" view, so sending an
  // invite refreshes the quota and the list in one invalidation.
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
    mutationFn: postInvite,
    onSuccess: () => {
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: () => {
      // An email_failed still created the invite, so the list and quota moved
      // even though the send didn't succeed.
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  const outOfInvites = quota !== undefined && quota.remainingToday <= 0;
  const canSubmit =
    email.trim() !== "" && !send.isPending && !outOfInvites && quota !== undefined;

  function handleEmailChange(value: string) {
    if (send.isSuccess || send.isError) send.reset();
    setEmail(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    send.mutate(email.trim());
  }

  const failure =
    send.error instanceof InviteError ? send.error.failure : null;

  return (
    <div className="default-radius border border-gray-50 bg-gray-50 p-5">
      <h2 className="text-lg font-bold text-gray-800">Invite a friend</h2>
      <p className="mb-4 text-sm text-gray-600">
        Send an invite link. When they sign up and buy credits — or run their
        first job on real hardware — you both get 100 credits.
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-gray-600">
          Their email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="friend@example.com"
            disabled={outOfInvites}
            className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          />
        </label>

        <LRButton
          variant="primary"
          type="submit"
          disabled={!canSubmit}
          className="w-full"
        >
          {send.isPending ? "Sending…" : "Send invite"}
        </LRButton>

        {outOfInvites && (
          <p className="text-xs text-gray-600">
            You&apos;ve reached today&apos;s invite limit, try again tomorrow.
          </p>
        )}

        {send.isSuccess && send.data && (
          <p className="text-sm text-green-700">
            Invite sent to {send.data.email}. The link expires{" "}
            {new Date(send.data.expiresAt).toLocaleDateString()}.
          </p>
        )}

        {failure?.code === "already_member" && (
          <p className="text-sm text-gray-700">
            {failure.message} No invite was sent, and this didn&apos;t use one
            of today&apos;s invites.
          </p>
        )}

        {failure && failure.code !== "already_member" && (
          <p className="text-xs text-red-600">{failure.message}</p>
        )}
      </form>
    </div>
  );
}
