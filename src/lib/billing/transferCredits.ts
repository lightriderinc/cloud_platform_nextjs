import { randomUUID } from "crypto";
import type { Customer } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { db } from "@/lib/billing/db";
import {
  findUserByPrimaryEmail,
  isManagementApiConfigured,
} from "@/lib/logto/management";

/**
 * Customer-to-customer credit transfers ("Share Credits").
 *
 * Transfers are final: there is no pending/accept state and no reversal path.
 * Once the transaction below commits, the only way to move the credits back is
 * another transfer in the opposite direction.
 *
 * ONE CODE PATH. A single-recipient send is a batch of one row — there is no
 * separate single-transfer implementation to keep in step with this one.
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

/** Maximum recipients in one submit. Over this, the batch is rejected outright. */
export const MAX_BATCH_ROWS = 20;

/** Ledger `reason` prefixes. Kept alongside the columns, never replaced by them. */
export const TRANSFER_SENT_PREFIX = "transfer_sent:";
export const TRANSFER_RECEIVED_PREFIX = "transfer_received:";

export type BatchRowInput = { email: string; amountCents: number };

/** Per-row outcome. Every input row gets exactly one of these back. */
export type BatchRowResult =
  | {
      status: "ok";
      email: string;
      amountCents: number;
      transferId: string;
      recipientEmail: string;
    }
  | { status: "recipient_not_found"; email: string; amountCents: number }
  | { status: "self_transfer"; email: string; amountCents: number }
  | { status: "invalid_amount"; email: string; amountCents: number; message: string }
  | { status: "lookup_failed"; email: string; amountCents: number; message: string };

export type BatchResult =
  | {
      status: "ok";
      batchId: string;
      /** Rows in the same order they were submitted, after de-duplication. */
      rows: BatchRowResult[];
      /** Sum of the rows that actually moved money. */
      totalSentCents: number;
      senderBalanceCents: number;
      /** True when this key had already been processed and nothing re-ran. */
      replayed: boolean;
    }
  | {
      status: "insufficient_balance";
      message: string;
      balanceCents: number;
      requestedCents: number;
      /** Still returned, so the UI can show which rows would have been sent. */
      rows: BatchRowResult[];
    }
  | { status: "too_many_rows"; message: string }
  | { status: "no_valid_rows"; message: string; rows: BatchRowResult[] }
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
 * Merges rows addressed to the same person into one summed row.
 *
 * Sending twice to the same address in one submit is a mistake we can resolve
 * rather than refuse: the user's evident intent is "this person gets the
 * total". Erroring would be obstructive and processing only one row would
 * silently lose money from the user's point of view.
 *
 * Case-insensitive, matching how Logto compares email identifiers (see
 * findUserByPrimaryEmail). Order follows each address's FIRST appearance.
 */
export function dedupeRows(rows: BatchRowInput[]): BatchRowInput[] {
  const merged = new Map<string, BatchRowInput>();

  for (const row of rows) {
    const email = row.email.trim();
    const key = email.toLowerCase();
    const existing = merged.get(key);
    if (existing) {
      existing.amountCents += row.amountCents;
    } else {
      merged.set(key, { email, amountCents: row.amountCents });
    }
  }

  return [...merged.values()];
}

/**
 * Validates, resolves and executes a whole batch.
 *
 * Order matters and is deliberate: every recipient is resolved BEFORE any
 * balance is touched, so a batch can never half-execute and then discover its
 * fourth address doesn't exist. Resolution is read-only; the single
 * transaction at the end is the only thing that writes.
 *
 * `idempotencyKey` makes the submit safe to retry: the key is inserted inside
 * the transaction, and its primary key is the guard — a second submit with the
 * same key loses that insert and returns the original result instead of moving
 * money twice.
 */
export async function transferCreditsBatch(
  sender: Customer,
  inputRows: BatchRowInput[],
  idempotencyKey: string,
): Promise<BatchResult> {
  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return {
      status: "error",
      cause: "caller",
      message: "Missing idempotency key.",
    };
  }

  if (inputRows.length === 0) {
    return {
      status: "error",
      cause: "caller",
      message: "Add at least one recipient.",
    };
  }

  // Cap BEFORE de-duplication: the limit is about how much work one submit
  // asks for (a Logto lookup per row), which is driven by what was sent, not
  // by what it collapses to.
  if (inputRows.length > MAX_BATCH_ROWS) {
    return {
      status: "too_many_rows",
      message: `You can send to at most ${MAX_BATCH_ROWS} recipients at once. Remove ${(
        inputRows.length - MAX_BATCH_ROWS
      ).toLocaleString()} and try again.`,
    };
  }

  // A replay that arrives before the original finished would otherwise do the
  // whole lookup pass again; checking first also lets an already-processed key
  // return without touching Logto at all.
  const alreadyProcessed = await db.processedTransferBatch.findUnique({
    where: { id: idempotencyKey },
  });
  if (alreadyProcessed) {
    return replayedResult(sender, alreadyProcessed.batchId);
  }

  const rows = dedupeRows(inputRows);

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

  // ---------------------------------------------------------------------
  // Resolution pass — read-only. Nothing below this writes until the
  // transaction, so an unresolvable row costs nothing but its own result.
  // ---------------------------------------------------------------------
  const results: BatchRowResult[] = [];
  const payable: Array<{
    recipient: Customer;
    amountCents: number;
    email: string;
    recipientEmail: string;
    transferId: string;
  }> = [];

  for (const row of rows) {
    const email = row.email.trim();

    if (!email) {
      results.push({
        status: "invalid_amount",
        email,
        amountCents: row.amountCents,
        message: "Enter the recipient's email address.",
      });
      continue;
    }

    if (!Number.isInteger(row.amountCents) || row.amountCents <= 0) {
      results.push({
        status: "invalid_amount",
        email,
        amountCents: row.amountCents,
        message: "Enter a whole number of credits greater than zero.",
      });
      continue;
    }

    let logtoUser;
    try {
      logtoUser = await findUserByPrimaryEmail(email);
    } catch (err) {
      console.error(`[transfer] Logto user lookup failed for ${email}:`, err);
      // One unreachable lookup must not be reported as "no account" — that
      // would push the sender toward inviting someone who already exists.
      results.push({
        status: "lookup_failed",
        email,
        amountCents: row.amountCents,
        message: "Couldn't look up that account right now.",
      });
      continue;
    }

    if (!logtoUser) {
      results.push({
        status: "recipient_not_found",
        email,
        amountCents: row.amountCents,
      });
      continue;
    }

    let recipient: Customer;
    try {
      recipient = await getOrCreateCustomer(
        logtoUser.id,
        logtoUser.primaryEmail ?? email,
      );
    } catch (err) {
      console.error(`[transfer] failed to provision Customer for ${email}:`, err);
      results.push({
        status: "lookup_failed",
        email,
        amountCents: row.amountCents,
        message: "Couldn't set up that recipient's account.",
      });
      continue;
    }

    // Compared on Customer.id, not on email: emails are nullable and
    // non-unique on Customer, so they are not an identity key here.
    if (recipient.id === sender.id) {
      results.push({ status: "self_transfer", email, amountCents: row.amountCents });
      continue;
    }

    const transferId = randomUUID();
    payable.push({
      recipient,
      amountCents: row.amountCents,
      email,
      recipientEmail: logtoUser.primaryEmail ?? email,
      transferId,
    });
    results.push({
      status: "ok",
      email,
      amountCents: row.amountCents,
      transferId,
      recipientEmail: logtoUser.primaryEmail ?? email,
    });
  }

  if (payable.length === 0) {
    return {
      status: "no_valid_rows",
      message: "None of these recipients could be paid. See the details below.",
      rows: results,
    };
  }

  const totalCents = payable.reduce((sum, row) => sum + row.amountCents, 0);

  // Whole-batch affordability, checked against the total of the payable rows
  // only. Rejecting everything (rather than sending what fits) keeps the
  // outcome predictable: the user either sent exactly what they reviewed, or
  // sent nothing.
  if (sender.creditsBalanceCents < totalCents) {
    return {
      status: "insufficient_balance",
      message: `This batch totals ${totalCents.toLocaleString()} credits but your balance is ${sender.creditsBalanceCents.toLocaleString()}. Nothing was sent.`,
      balanceCents: sender.creditsBalanceCents,
      requestedCents: totalCents,
      rows: results,
    };
  }

  const batchId = randomUUID();

  try {
    return await db.$transaction(async (tx) => {
      // The idempotency key is claimed INSIDE the transaction, so two
      // simultaneous submits of the same key contend on the primary key: one
      // inserts, the other throws P2002 and rolls back having moved nothing.
      await tx.processedTransferBatch.create({
        data: { id: idempotencyKey, customerId: sender.id, batchId },
      });

      // Atomic compare-and-set for the batch total. The `gte` predicate and
      // the decrement are one statement, so two concurrent batches cannot both
      // observe a sufficient balance and both debit it. Under READ COMMITTED
      // the second UPDATE re-evaluates the predicate against the first one's
      // committed row and matches nothing, giving count === 0 rather than an
      // overdraft. Same guard as the single-recipient path had, applied once
      // to the whole total instead of per row — a partially-funded batch must
      // not partially send.
      const debited = await tx.customer.updateMany({
        where: { id: sender.id, creditsBalanceCents: { gte: totalCents } },
        data: { creditsBalanceCents: { decrement: totalCents } },
      });

      if (debited.count === 0) {
        const fresh = await tx.customer.findUnique({
          where: { id: sender.id },
          select: { creditsBalanceCents: true },
        });
        const balanceCents = fresh?.creditsBalanceCents ?? 0;
        // Throwing (not returning) so the claimed idempotency key rolls back
        // too — this submit did nothing, and retrying it must be allowed.
        throw new InsufficientBalanceError(balanceCents, totalCents);
      }

      const senderEmail = sender.email ?? null;

      for (const row of payable) {
        // An increment can't overdraft, so no conditional guard is needed.
        await tx.customer.update({
          where: { id: row.recipient.id },
          data: { creditsBalanceCents: { increment: row.amountCents } },
        });

        await tx.creditLedgerEntry.createMany({
          data: [
            {
              customerId: sender.id,
              amountCents: -row.amountCents,
              reason: `${TRANSFER_SENT_PREFIX}${row.transferId}`,
              transferId: row.transferId,
              counterpartyCustomerId: row.recipient.id,
              counterpartyEmailSnapshot: row.recipientEmail,
              batchId,
            },
            {
              customerId: row.recipient.id,
              amountCents: row.amountCents,
              reason: `${TRANSFER_RECEIVED_PREFIX}${row.transferId}`,
              transferId: row.transferId,
              counterpartyCustomerId: sender.id,
              counterpartyEmailSnapshot: senderEmail,
              batchId,
            },
          ],
        });
      }

      const senderAfter = await tx.customer.findUnique({
        where: { id: sender.id },
        select: { creditsBalanceCents: true },
      });

      return {
        status: "ok" as const,
        batchId,
        rows: results,
        totalSentCents: totalCents,
        senderBalanceCents: senderAfter?.creditsBalanceCents ?? 0,
        replayed: false,
      };
    });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return {
        status: "insufficient_balance",
        message: `This batch totals ${err.requestedCents.toLocaleString()} credits but your balance is ${err.balanceCents.toLocaleString()}. Nothing was sent.`,
        balanceCents: err.balanceCents,
        requestedCents: err.requestedCents,
        rows: results,
      };
    }

    // A duplicate key means a concurrent submit of the same idempotency key
    // won the race. That one did the work; this one correctly did nothing.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const winner = await db.processedTransferBatch.findUnique({
        where: { id: idempotencyKey },
      });
      if (winner) return replayedResult(sender, winner.batchId);
    }

    // Everything is in one transaction, so a throw here means none of it
    // landed — there is no partial batch to clean up.
    console.error(`[transfer] batch ${batchId} failed and rolled back:`, err);
    return {
      status: "error",
      cause: "server",
      message: "The transfer failed and no credits were moved. Please try again.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Thrown inside the transaction so the whole thing, key included, rolls back. */
class InsufficientBalanceError extends Error {
  constructor(
    readonly balanceCents: number,
    readonly requestedCents: number,
  ) {
    super("insufficient balance");
  }
}

/**
 * Rebuilds the outcome of a batch that was already written, so a retried
 * submit sees what its original attempt did rather than a confusing error.
 */
async function replayedResult(
  sender: Customer,
  batchId: string,
): Promise<BatchResult> {
  const entries = await db.creditLedgerEntry.findMany({
    where: { batchId, customerId: sender.id },
    orderBy: { createdAt: "asc" },
  });

  const fresh = await db.customer.findUnique({
    where: { id: sender.id },
    select: { creditsBalanceCents: true },
  });

  const rows: BatchRowResult[] = entries.map((entry) => ({
    status: "ok" as const,
    email: entry.counterpartyEmailSnapshot ?? "",
    amountCents: Math.abs(entry.amountCents),
    transferId: entry.transferId ?? "",
    recipientEmail: entry.counterpartyEmailSnapshot ?? "",
  }));

  return {
    status: "ok",
    batchId,
    rows,
    totalSentCents: entries.reduce((sum, e) => sum + Math.abs(e.amountCents), 0),
    senderBalanceCents: fresh?.creditsBalanceCents ?? 0,
    replayed: true,
  };
}
