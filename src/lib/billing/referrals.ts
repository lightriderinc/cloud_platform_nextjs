import type { Referral } from "@prisma/client";
import { db } from "@/lib/billing/db";

/**
 * Refer & Earn.
 *
 * A Referral is created alongside every Invite (see lib/billing/invites.ts),
 * linked by inviteToken. It moves through exactly two states in practice:
 *
 *   pending  — invite sent; refereeCustomerId filled in once they sign up
 *   rewarded — the referee did something qualifying and both sides were paid
 *
 * There is no observable "qualified" state: recognising qualification and
 * granting the reward happen in one transaction, so a referral is never
 * qualified-but-unpaid.
 */

/** Flat grant to EACH side. 1 credit = 1 cent, so this is $1.00 each. */
export const REFERRAL_REWARD_CENTS = 100;

/** Ledger `reason` prefix for both sides of a referral payout. */
export const REFERRAL_REWARD_PREFIX = "referral_reward:";

/** What the referee did to earn it. Recorded on the Referral for auditing. */
export type QualifyingEvent = "first_qpu_job" | "first_purchase";

/**
 * Links a signed-up user to the referral that invited them.
 *
 * Status stays "pending": the referee now exists, but existing is not
 * qualifying — they still have to run a real job or buy something.
 *
 * Idempotent via the `refereeCustomerId: null` predicate, so a repeated call
 * matches nothing and returns null rather than reassigning the referral to a
 * different person.
 */
export async function markRefereeSignedUp(
  referralId: string,
  refereeCustomerId: string,
): Promise<Referral | null> {
  const claimed = await db.referral.updateMany({
    where: { id: referralId, refereeCustomerId: null, status: "pending" },
    data: { refereeCustomerId },
  });

  if (claimed.count === 0) return null;

  return db.referral.findUnique({ where: { id: referralId } });
}

/**
 * Pays out a referral if this customer is a referee whose referral is still
 * pending. Safe to call after ANY qualifying action; it decides for itself
 * whether anything is owed.
 *
 * FIRE-AND-FORGET. Callers must not await this in a way that can fail or
 * delay the user's actual job or purchase — a reward is a bonus, and no
 * failure here may ever cost someone the thing they were actually doing.
 * Every path returns rather than throws, and everything is logged.
 *
 * "First" is defined as `status === "pending"`, not by counting jobs or
 * purchases. That is what makes the two call sites — job submit and the
 * Stripe webhook — mutually exclusive without knowing about each other: the
 * conditional update below is the whole race guard.
 */
export async function grantReferralRewardIfEligible(
  refereeCustomerId: string,
  qualifyingEvent: QualifyingEvent,
): Promise<void> {
  try {
    const referral = await db.referral.findFirst({
      where: { refereeCustomerId, status: "pending" },
    });

    // The overwhelmingly common case: this customer wasn't referred, or was
    // already rewarded. Costs one indexed lookup and nothing else.
    if (!referral) return;

    await db.$transaction(async (tx) => {
      // Claim the referral FIRST. The `status: "pending"` predicate is the
      // idempotency guard: if a job submit and a Stripe webhook arrive at the
      // same moment, exactly one UPDATE matches a pending row and the other
      // matches zero, so the reward is granted once. Doing this before any
      // ledger write means a lost race costs nothing to unwind.
      const claimed = await tx.referral.updateMany({
        where: { id: referral.id, status: "pending" },
        data: {
          status: "rewarded",
          qualifyingEventReason: qualifyingEvent,
          rewardCents: REFERRAL_REWARD_CENTS,
          qualifiedAt: new Date(),
          rewardedAt: new Date(),
        },
      });

      if (claimed.count === 0) {
        // Another qualifying event won the race and already paid this out.
        // Not an error — the end state is exactly what we wanted.
        console.log(
          `[referral] ${referral.id} already rewarded by a concurrent event; skipping.`,
        );
        return;
      }

      // Platform grants, NOT transfers: nobody is debited, so there is no
      // balance to check and no compare-and-set needed. Each side gets one
      // positive ledger row plus a matching balance increment.
      for (const customerId of [referral.referrerCustomerId, refereeCustomerId]) {
        await tx.customer.update({
          where: { id: customerId },
          data: { creditsBalanceCents: { increment: REFERRAL_REWARD_CENTS } },
        });
        await tx.creditLedgerEntry.create({
          data: {
            customerId,
            amountCents: REFERRAL_REWARD_CENTS,
            reason: `${REFERRAL_REWARD_PREFIX}${referral.id}`,
          },
        });
      }

      console.log(
        `[referral] rewarded ${referral.id} (${qualifyingEvent}): ${REFERRAL_REWARD_CENTS} credits to each side.`,
      );
    });
  } catch (err) {
    // Swallowed on purpose. This runs after the user's job or purchase has
    // already succeeded; surfacing this would report a failure for something
    // that worked. The referral stays pending and the next qualifying event
    // retries it.
    console.error(
      `[referral] reward for referee ${refereeCustomerId} (${qualifyingEvent}) failed:`,
      err,
    );
  }
}
