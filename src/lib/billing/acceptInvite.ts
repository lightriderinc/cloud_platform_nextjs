import type { Invite } from "@prisma/client";
import { db } from "@/lib/billing/db";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { markRefereeSignedUp } from "@/lib/billing/referrals";

/**
 * Links an invite to the person who just signed in.
 *
 * WHY THERE ARE TWO WAYS TO FIND THE INVITE
 *
 * The primary carrier is a cookie set by /invite and read back in /callback.
 * It is precise — it names the exact invite that was clicked — but it has to
 * survive a full round trip out to Logto and back, and anything that breaks
 * that chain loses the referral with no trace: the Invite simply stays
 * "pending", which is indistinguishable from "they never signed up".
 *
 * That is not hypothetical. xhuo8989@gmail.com was invited at 14:59:57 on
 * 2026-09-23, created an account at 15:01:53 and completed a purchase at
 * 15:07:53 — and the Invite and Referral rows were still untouched, so the
 * reward never fired. Nothing errored; the link was simply never made.
 * guddetivinithkumarreddy9@gmail.com shows the same pattern on 2026-09-21.
 *
 * So there is now a fallback: match a pending invite by the address the
 * person signed up with. It is deliberately narrower than the cookie path —
 * see resolveInviteByEmail below for why it only ever applies to a brand-new
 * account.
 *
 * Best-effort throughout: a failure here must never break sign-in, so every
 * path returns rather than throws, and every outcome is logged. Silence was
 * the reason the original failure went unnoticed.
 */

type LinkInput = {
  /** Token from the /invite cookie, when it survived. */
  token?: string;
  logtoUserId: string;
  email?: string;
};

export async function linkInviteOnSignIn({
  token,
  logtoUserId,
  email,
}: LinkInput): Promise<void> {
  try {
    // Read BEFORE getOrCreateCustomer, which would create the row and make
    // every sign-in look like a first one.
    const existing = await db.customer.findUnique({ where: { logtoUserId } });
    const isNewSignup = !existing;

    const invite =
      (token ? await resolveInviteByToken(token) : null) ??
      (await resolveInviteByEmail(email, isNewSignup));

    if (!invite) {
      if (token) {
        console.warn(
          `[invite] token ${token.slice(0, 8)} did not resolve to a pending invite.`,
        );
      } else if (isNewSignup) {
        console.log(
          `[invite] new signup ${logtoUserId} matched no pending invite.`,
        );
      }
      return;
    }

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

    if (accepted.count === 0) {
      console.log(`[invite] ${invite.id} was accepted concurrently; skipping.`);
      return;
    }

    const referral = await db.referral.findFirst({
      where: { inviteToken: invite.token },
    });

    if (!referral) {
      // Invite and Referral are written in one transaction, so this should be
      // unreachable. Logged loudly rather than ignored: it means the invitee
      // signed up with no reward attached and nothing else would notice.
      console.error(
        `[invite] ${invite.id} accepted but has no linked Referral; reward cannot fire.`,
      );
      return;
    }

    const linked = await markRefereeSignedUp(referral.id, customer.id);

    if (!linked) {
      console.error(
        `[invite] referral ${referral.id} could not be linked to customer ${customer.id} ` +
          `(already claimed, or no longer pending). The reward will not fire.`,
      );
      return;
    }

    console.log(
      `[invite] ${invite.id} accepted by customer ${customer.id} via ` +
        `${token ? "token" : "email match"}; referral ${referral.id} linked.`,
    );
  } catch (err) {
    console.error(`[invite] failed to link invite for ${logtoUserId}:`, err);
  }
}

/** The exact invite that was clicked. Precise, and preferred when available. */
async function resolveInviteByToken(token: string): Promise<Invite | null> {
  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite) return null;
  if (invite.status !== "pending") return null;
  if (invite.expiresAt.getTime() <= Date.now()) return null;
  return invite;
}

/**
 * Fallback: a pending invite addressed to the email this person just signed
 * up with.
 *
 * Restricted to a BRAND-NEW account on purpose. Without that check, an
 * existing customer who happens to have a pending invite sitting in someone's
 * outbox would get linked as a referee the next time they signed in, and
 * their next purchase would pay out a referral for a customer the referrer
 * never actually brought in. Requiring that no Customer existed a moment ago
 * limits this to what the invite was for: a genuine new signup.
 *
 * Matching is case-insensitive because invites are stored lowercased while
 * the identity provider echoes back whatever the user typed.
 */
async function resolveInviteByEmail(
  email: string | undefined,
  isNewSignup: boolean,
): Promise<Invite | null> {
  if (!isNewSignup) return null;

  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  // Newest first: if someone was invited more than once, the most recent
  // invite is the one they most plausibly acted on.
  return db.invite.findFirst({
    where: {
      email: normalized,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}
