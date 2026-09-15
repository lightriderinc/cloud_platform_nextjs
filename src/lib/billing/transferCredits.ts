import { randomUUID } from "crypto";
import type { Customer } from "@prisma/client";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { db } from "@/lib/billing/db";
import {
  findUserByPrimaryEmail,
  isManagementApiConfigured,
} from "@/lib/logto/management";

/**
 * Customer-to-customer credit transfers ("Share Credits").
 *
 * Transfers are final: there is no pending/accept state and no reversal
 * path. Once the transaction below commits, the only way to move the credits
 * back is another transfer in the opposite direction.
 *
 * UNITS: 1 Light Rider credit = 1 cent = $0.01, so the "whole credits" the UI
 * collects map 1:1 onto Customer.creditsBalanceCents. The conversion is the
 * identity function today — it lives in creditsToCents() rather than being
 * inlined so that if the credit/cent ratio ever stops being 1:1 there is
 * exactly one place to change.
 */

/** Whole credits as entered by a user -> the cents unit the schema stores. */
export function creditsToCents(credits: number): number {
  return credits;
}

export type TransferResult =
  | {
      status: "ok";
      transferId: string;
      amountCents: number;
      /** Sender's balance after the debit — authoritative, read inside the tx. */
      senderBalanceCents: number;
      recipientEmail: string;
    }
  | { status: "insufficient_balance"; message: string; balanceCents: number }
  | { status: "recipient_not_found"; message: string; email: string }
  | {
      status: "error";
      message: string;
      /**
       * Whether the caller can fix this by changing their input ("caller" —
       * maps to a 4xx) or whether it's on us ("server" — 5xx). Carried as a
       * field so the route never has to infer intent from message text.
       */
      cause: "caller" | "server";
      /**
       * Upstream failure detail (e.g. the Logto status and body) for
       * diagnostics. The route only ever forwards this outside production —
       * it names internal infrastructure, which is fine in preview and not
       * something to hand to real users.
       */
      detail?: string;
    };

/**
 * Moves `amountCents` from `sender` to whoever owns `recipientEmail`.
 *
 * Returns a typed result for every *expected* outcome rather than throwing —
 * "not enough credits" and "that person has no account" are normal answers to
 * this question, not exceptions. Only genuinely unexpected failures (a dead
 * DB, a Logto outage) come back as `status: "error"`, and those are logged
 * server-side with the real cause while the caller gets a generic message.
 */
export async function transferCredits(
  sender: Customer,
  recipientEmail: string,
  amountCents: number,
): Promise<TransferResult> {
  const email = recipientEmail.trim();

  if (!email) {
    return {
      status: "error",
      cause: "caller",
      message: "Enter the recipient's email address.",
    };
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return {
      status: "error",
      cause: "caller",
      message: "Enter a whole number of credits greater than zero.",
    };
  }

  // Cheap pre-check purely so an obviously-underfunded transfer never reaches
  // the Logto Management API. This is NOT the guard that matters — `sender`
  // was read before this call and can already be stale. The authoritative
  // check is the conditional updateMany inside the transaction below.
  if (sender.creditsBalanceCents < amountCents) {
    return {
      status: "insufficient_balance",
      message: `You're trying to send ${amountCents.toLocaleString()} credits but only have ${sender.creditsBalanceCents.toLocaleString()}.`,
      balanceCents: sender.creditsBalanceCents,
    };
  }

  // Without M2M credentials we cannot tell "no such account" apart from
  // "couldn't ask" — and answering recipient_not_found here would send the
  // user off to invite someone who already has an account. Fail loudly instead.
  if (!isManagementApiConfigured()) {
    console.error(
      "[transfer] Logto Management API is not configured; cannot resolve recipients by email.",
    );
    return {
      status: "error",
      cause: "server",
      message: "Credit sharing is temporarily unavailable. Please try again later.",
    };
  }

  let logtoUser;
  try {
    logtoUser = await findUserByPrimaryEmail(email);
  } catch (err) {
    console.error("[transfer] Logto user lookup failed:", err);
    return {
      status: "error",
      cause: "server",
      message: "Couldn't look up that account right now. Please try again.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!logtoUser) {
    return {
      status: "recipient_not_found",
      message: "This user doesn't have an account yet.",
      email,
    };
  }

  // A Logto account can exist with no Customer row — those are created lazily
  // on first billing contact. Provisioning theirs here (idempotent on
  // logtoUserId) also grants the one-time signup credit they'd have received
  // on their own next visit, so the recipient is never worse off for having
  // been paid before they'd shopped.
  let recipient: Customer;
  try {
    recipient = await getOrCreateCustomer(
      logtoUser.id,
      logtoUser.primaryEmail ?? email,
    );
  } catch (err) {
    console.error("[transfer] failed to provision recipient Customer:", err);
    return {
      status: "error",
      cause: "server",
      message: "Couldn't set up the recipient's account. Please try again.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  // Compared on Customer.id, not on email: emails are nullable and
  // non-unique on Customer, so they are not an identity key here.
  if (recipient.id === sender.id) {
    return {
      status: "error",
      cause: "caller",
      message: "You can't send credits to yourself.",
    };
  }

  const transferId = randomUUID();

  try {
    return await db.$transaction(async (tx) => {
      // Atomic compare-and-set: the `gte` predicate and the decrement are one
      // statement, so two concurrent transfers cannot both observe a
      // sufficient balance and both debit it. Under READ COMMITTED the second
      // UPDATE re-evaluates the predicate against the first one's committed
      // row and matches nothing, giving count === 0 instead of an overdraft.
      // This is deliberately stronger than the existing job/entropy/
      // reservation debits, which pre-check an in-memory row and can drive a
      // balance negative under concurrency.
      const debited = await tx.customer.updateMany({
        where: { id: sender.id, creditsBalanceCents: { gte: amountCents } },
        data: { creditsBalanceCents: { decrement: amountCents } },
      });

      if (debited.count === 0) {
        const fresh = await tx.customer.findUnique({
          where: { id: sender.id },
          select: { creditsBalanceCents: true },
        });
        const balanceCents = fresh?.creditsBalanceCents ?? 0;
        // Returning (rather than throwing) still rolls nothing back, because
        // nothing was written — the updateMany matched zero rows.
        return {
          status: "insufficient_balance" as const,
          message: `You're trying to send ${amountCents.toLocaleString()} credits but only have ${balanceCents.toLocaleString()}.`,
          balanceCents,
        };
      }

      // An increment can't overdraft, so no conditional guard is needed here.
      const credited = await tx.customer.update({
        where: { id: recipient.id },
        data: { creditsBalanceCents: { increment: amountCents } },
      });

      await tx.creditLedgerEntry.createMany({
        data: [
          {
            customerId: sender.id,
            amountCents: -amountCents,
            reason: `transfer_sent:${transferId}`,
            transferId,
            counterpartyCustomerId: recipient.id,
          },
          {
            customerId: recipient.id,
            amountCents,
            reason: `transfer_received:${transferId}`,
            transferId,
            counterpartyCustomerId: sender.id,
          },
        ],
      });

      const senderAfter = await tx.customer.findUnique({
        where: { id: sender.id },
        select: { creditsBalanceCents: true },
      });

      return {
        status: "ok" as const,
        transferId,
        amountCents,
        senderBalanceCents: senderAfter?.creditsBalanceCents ?? 0,
        recipientEmail: credited.email ?? email,
      };
    });
  } catch (err) {
    // All four writes are in one transaction, so a throw here means none of
    // them landed — there is no partial-transfer state to clean up.
    console.error(`[transfer] transfer ${transferId} failed and rolled back:`, err);
    return {
      status: "error",
      cause: "server",
      message: "The transfer failed and no credits were moved. Please try again.",
    };
  }
}
