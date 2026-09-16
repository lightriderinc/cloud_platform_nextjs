import type { Referral } from "@prisma/client";
import { db } from "@/lib/billing/db";

/**
 * Referral programme — placeholder.
 *
 * DELIBERATELY INERT. Nothing in the app creates a Referral row yet (there is
 * no invite flow to create one), nothing calls the function below, and no
 * qualifying-event listener is wired into job billing or the Stripe webhook.
 * Those stay untouched.
 *
 * TWO OPEN DECISIONS, both unmade on purpose rather than defaulted:
 *   1. What event qualifies a referral (first real-hardware job? first
 *      purchase? something else) — recorded later in `qualifyingEventReason`.
 *   2. The reward amount, and whether it goes to the referrer, the referee or
 *      both — recorded later in `rewardCents`.
 * Both columns are nullable and stay null until those calls are made.
 *
 * What IS here is the one step whose shape is already fixed regardless of
 * those answers: attaching a referee once they sign up. Having it ready means
 * Send Invite's post-signup step has exactly one function to call.
 */

/**
 * Links a signed-up user to the referral that invited them.
 *
 * Status stays "pending" — the referee now exists, but existing is not the
 * same as qualifying, and what qualifying means is still undecided. Writing
 * "qualified" here would silently pick that decision.
 *
 * Idempotent by way of the `refereeCustomerId: null` predicate: a second call
 * for a referral that is already claimed matches nothing and returns null,
 * rather than silently reassigning a referral to a different person.
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
