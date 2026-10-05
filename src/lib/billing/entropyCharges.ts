import { Prisma } from "@prisma/client";
import type { Customer, EntropyCharge } from "@prisma/client";
import { db } from "@/lib/billing/db";
import { ENTROPY_DRAW_PREFIX, ENTROPY_REFUND_PREFIX } from "@/lib/billing/ledgerReasons";
import { hasUnlockedCredits } from "@/lib/billing/planCheck";

/**
 * Charges for draws made on the entropy platform (lr_entropy_platform), which
 * shares this app's wallet. The entropy site's server calls these through
 * /api/internal/entropy/* (authenticated by lib/auth/serviceAuth.ts); the
 * browser never reaches them.
 *
 * Flow per draw: charge (before the egress is touched) -> draw -> settle on
 * delivery, or refund on any failure. A draw that is charged but never
 * settled or refunded (the entropy server died mid-flow) is refunded by
 * sweepStaleEntropyCharges(), so a user is never charged for bytes that were
 * not delivered.
 *
 * DEBIT PATTERN: the same atomic compare-and-set as transferCredits.ts
 * (customer.updateMany with a `gte` guard inside db.$transaction), never the
 * check-then-decrement used by the older quantum/withdraw/reservation paths.
 * Every status change is a conditional updateMany on `status: "charged"`, so
 * a draw can be settled or refunded, never both, and never twice.
 *
 * PRICE: 1 entropy token = 1 Light Rider credit = 1 cent, and one token buys
 * up to 256 bytes: ceil(bytes / 256), minimum 1, for every serving mode.
 */

export const ENTROPY_BYTES_PER_CREDIT = 256;
export const ENTROPY_MAX_BYTES = 65_536; // EMS per-request maximum
export const ENTROPY_MODES = ["pool", "custom", "source", "card"] as const;
export type EntropyMode = (typeof ENTROPY_MODES)[number];

/** Ledger `reason` prefixes ("namespace:detail"), suffixed with the mode. */
export { ENTROPY_DRAW_PREFIX, ENTROPY_REFUND_PREFIX };

/** A charge left in `charged` this long is treated as abandoned and refunded. */
export const STALE_CHARGE_MS = 10 * 60 * 1000;

const DRAW_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cost of a draw in cents (= credits = entropy tokens). */
export function entropyDrawCostCents(bytes: number): number {
  return Math.max(1, Math.ceil(bytes / ENTROPY_BYTES_PER_CREDIT));
}

export type ChargeInput = { drawId: string; mode: string; bytes: number };

export type ChargeResult =
  | {
      status: "charged";
      drawId: string;
      amountCents: number;
      balanceCents: number;
      /** True when this draw id was already charged and nothing re-ran. */
      replayed: boolean;
      /** The charge's current state - may be settled/refunded on a replay. */
      chargeStatus: string;
    }
  | { status: "insufficient_balance"; amountCents: number; balanceCents: number }
  | { status: "locked"; amountCents: number; balanceCents: number }
  | { status: "invalid"; message: string }
  | { status: "conflict"; message: string };

export function validateChargeInput(input: ChargeInput): string | null {
  if (typeof input.drawId !== "string" || !DRAW_ID_RE.test(input.drawId)) {
    return "drawId must be a UUID.";
  }
  if (!ENTROPY_MODES.includes(input.mode as EntropyMode)) {
    return `mode must be one of ${ENTROPY_MODES.join(", ")}.`;
  }
  if (!Number.isInteger(input.bytes) || input.bytes < 1 || input.bytes > ENTROPY_MAX_BYTES) {
    return `bytes must be 1..${ENTROPY_MAX_BYTES}.`;
  }
  return null;
}

/**
 * Debits the cost of one draw, BEFORE the egress is called.
 *
 * Signup credits are locked for entropy exactly as for real hardware
 * (planCheck.hasUnlockedCredits): until the account has made a purchase or
 * received a transfer, a draw is refused as `locked` without touching the
 * balance.
 */
export async function chargeEntropyDraw(
  customer: Customer,
  input: ChargeInput,
): Promise<ChargeResult> {
  const invalid = validateChargeInput(input);
  if (invalid) return { status: "invalid", message: invalid };
  const amountCents = entropyDrawCostCents(input.bytes);

  // A retry of an already-charged draw returns the original outcome.
  const existing = await db.entropyCharge.findUnique({ where: { id: input.drawId } });
  if (existing) return replayed(customer, existing, input);

  if (!(await hasUnlockedCredits(customer.id))) {
    return { status: "locked", amountCents, balanceCents: customer.creditsBalanceCents };
  }

  try {
    return await db.$transaction(async (tx) => {
      // Claimed INSIDE the transaction: two simultaneous charges of the same
      // draw id contend on the primary key, one inserts, the other rolls back.
      await tx.entropyCharge.create({
        data: {
          id: input.drawId,
          customerId: customer.id,
          mode: input.mode,
          bytes: input.bytes,
          amountCents,
        },
      });

      // Atomic compare-and-set: the `gte` predicate and the decrement are one
      // statement, so concurrent draws cannot both see enough balance.
      const debited = await tx.customer.updateMany({
        where: { id: customer.id, creditsBalanceCents: { gte: amountCents } },
        data: { creditsBalanceCents: { decrement: amountCents } },
      });
      if (debited.count === 0) {
        const fresh = await tx.customer.findUnique({
          where: { id: customer.id },
          select: { creditsBalanceCents: true },
        });
        // Throw so the claimed draw id rolls back too: nothing was charged,
        // and the same draw may be retried after a top-up.
        throw new InsufficientBalanceError(fresh?.creditsBalanceCents ?? 0);
      }

      await tx.creditLedgerEntry.create({
        data: {
          customerId: customer.id,
          amountCents: -amountCents,
          reason: `${ENTROPY_DRAW_PREFIX}${input.mode}`,
          entropyChargeId: input.drawId,
        },
      });

      const after = await tx.customer.findUnique({
        where: { id: customer.id },
        select: { creditsBalanceCents: true },
      });
      return {
        status: "charged" as const,
        drawId: input.drawId,
        amountCents,
        balanceCents: after?.creditsBalanceCents ?? 0,
        replayed: false,
        chargeStatus: "charged",
      };
    });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return { status: "insufficient_balance", amountCents, balanceCents: err.balanceCents };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await db.entropyCharge.findUnique({ where: { id: input.drawId } });
      if (winner) return replayed(customer, winner, input);
    }
    throw err;
  }
}

async function replayed(
  customer: Customer,
  existing: EntropyCharge,
  input: ChargeInput,
): Promise<ChargeResult> {
  // A draw id is only ever one user's one draw. Anything else is a client
  // bug (or probing), never a reason to move money.
  if (
    existing.customerId !== customer.id ||
    existing.mode !== input.mode ||
    existing.bytes !== input.bytes
  ) {
    return { status: "conflict", message: "This draw id was already used for a different draw." };
  }
  const fresh = await db.customer.findUnique({
    where: { id: customer.id },
    select: { creditsBalanceCents: true },
  });
  return {
    status: "charged",
    drawId: existing.id,
    amountCents: existing.amountCents,
    balanceCents: fresh?.creditsBalanceCents ?? 0,
    replayed: true,
    chargeStatus: existing.status,
  };
}

export type SettleResult =
  | { status: "settled"; replayed: boolean }
  | { status: "not_found" }
  | { status: "already_refunded" };

/** Marks a charged draw as delivered, recording the EMS receipt id. */
export async function settleEntropyDraw(
  customer: Customer,
  drawId: string,
  egressRequestId: string,
): Promise<SettleResult> {
  const moved = await db.entropyCharge.updateMany({
    where: { id: drawId, customerId: customer.id, status: "charged" },
    data: { status: "settled", settledAt: new Date(), egressRequestId: egressRequestId.slice(0, 200) },
  });
  if (moved.count === 1) return { status: "settled", replayed: false };

  const row = await db.entropyCharge.findUnique({ where: { id: drawId } });
  if (!row || row.customerId !== customer.id) return { status: "not_found" };
  if (row.status === "settled") return { status: "settled", replayed: true };
  // Refunded first (a late settle after a timeout refund, or the sweep):
  // the user keeps the refund and the bytes. Never re-charge silently.
  return { status: "already_refunded" };
}

export type RefundResult =
  | { status: "refunded"; amountCents: number; balanceCents: number; replayed: boolean }
  | { status: "not_found" }
  | { status: "already_settled" };

/**
 * Returns a charged draw's credits. The amount is always the charge's own
 * amount - never caller-supplied - so a refund can only undo a real debit,
 * at most once.
 */
export async function refundEntropyDraw(
  drawId: string,
  reason: string,
  customerId?: string,
): Promise<RefundResult> {
  const row = await db.entropyCharge.findUnique({ where: { id: drawId } });
  if (!row || (customerId && row.customerId !== customerId)) return { status: "not_found" };

  const result = await db.$transaction(async (tx) => {
    const moved = await tx.entropyCharge.updateMany({
      where: { id: drawId, status: "charged" },
      data: { status: "refunded", refundedAt: new Date(), refundReason: reason.slice(0, 200) },
    });
    if (moved.count === 0) return null;

    // An increment can't overdraft, so no guard is needed.
    const after = await tx.customer.update({
      where: { id: row.customerId },
      data: { creditsBalanceCents: { increment: row.amountCents } },
      select: { creditsBalanceCents: true },
    });
    await tx.creditLedgerEntry.create({
      data: {
        customerId: row.customerId,
        amountCents: row.amountCents,
        reason: `${ENTROPY_REFUND_PREFIX}${row.mode}`,
        entropyChargeId: row.id,
      },
    });
    return after.creditsBalanceCents;
  });

  if (result !== null) {
    return { status: "refunded", amountCents: row.amountCents, balanceCents: result, replayed: false };
  }
  const now = await db.entropyCharge.findUnique({ where: { id: drawId } });
  if (now?.status === "settled") return { status: "already_settled" };
  const balance = await db.customer.findUnique({
    where: { id: row.customerId },
    select: { creditsBalanceCents: true },
  });
  return {
    status: "refunded",
    amountCents: row.amountCents,
    balanceCents: balance?.creditsBalanceCents ?? 0,
    replayed: true,
  };
}

/**
 * Refunds every charge still `charged` after STALE_CHARGE_MS. Run by the
 * cron route and opportunistically per customer on wallet reads. Returns how
 * many were refunded.
 */
export async function sweepStaleEntropyCharges(customerId?: string): Promise<number> {
  const stale = await db.entropyCharge.findMany({
    where: {
      status: "charged",
      createdAt: { lt: new Date(Date.now() - STALE_CHARGE_MS) },
      ...(customerId ? { customerId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: { id: true },
  });
  let refunded = 0;
  for (const { id } of stale) {
    const r = await refundEntropyDraw(id, "sweep:unsettled");
    if (r.status === "refunded" && !r.replayed) refunded += 1;
  }
  return refunded;
}

class InsufficientBalanceError extends Error {
  constructor(readonly balanceCents: number) {
    super("insufficient balance");
  }
}
