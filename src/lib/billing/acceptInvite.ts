import { db } from "@/lib/billing/db";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { markRefereeSignedUp } from "@/lib/billing/referrals";

/**
 * Completes an invite once the invitee has actually signed in.
 *
 * Called from /callback with the token carried across the Logto redirect in a
 * cookie (see inviteCookie.ts). Best-effort by design: a failure here must
 * never break sign-in, which is why every path returns instead of throwing
 * and the caller clears the cookie regardless.
 *
 * Deliberately tolerant about WHO accepted. The invitee may legitimately sign
 * up with a different address than the one invited (a social login, or an
 * alias), and refusing those would silently drop real referrals. What is NOT
 * tolerated is the inviter accepting their own invite — that is the one case
 * where a mismatch means someone is gaming the reward.
 */
export async function acceptInviteForUser(
  token: string,
  logtoUserId: string,
  email?: string,
): Promise<void> {
  try {
    const invite = await db.invite.findUnique({ where: { token } });
    if (!invite) return;

    // Already accepted, or the link expired while they were signing up.
    if (invite.status !== "pending") return;
    if (invite.expiresAt.getTime() <= Date.now()) return;

    const customer = await getOrCreateCustomer(logtoUserId, email);

    if (customer.id === invite.inviterCustomerId) {
      console.warn(
        `[invite] ${invite.id} was opened by its own inviter; not accepting.`,
      );
      return;
    }

    // Conditional on status so two tabs completing sign-in at once can only
    // accept once — the same guard shape the referral reward uses.
    const accepted = await db.invite.updateMany({
      where: { id: invite.id, status: "pending" },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedByCustomerId: customer.id,
      },
    });

    if (accepted.count === 0) return;

    const referral = await db.referral.findFirst({
      where: { inviteToken: token },
    });

    if (!referral) {
      // Invite and Referral are written in one transaction, so this should be
      // unreachable — logged loudly rather than ignored, because it means the
      // invitee signed up with no reward attached and nothing else will notice.
      console.error(
        `[invite] ${invite.id} accepted but has no linked Referral; reward cannot fire.`,
      );
      return;
    }

    // Leaves status "pending": signing up is not yet a qualifying event.
    // The reward fires on their first real job or purchase.
    await markRefereeSignedUp(referral.id, customer.id);

    console.log(
      `[invite] ${invite.id} accepted by customer ${customer.id}; referral ${referral.id} linked.`,
    );
  } catch (err) {
    console.error(`[invite] failed to accept invite token ${token}:`, err);
  }
}
