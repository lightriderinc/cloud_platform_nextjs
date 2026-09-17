import { randomUUID } from "crypto";
import type { Customer, Invite } from "@prisma/client";
import { db } from "@/lib/billing/db";
import { isEmailConfigured, sendEmail } from "@/lib/email/postmark";
import {
  findUserByPrimaryEmail,
  isManagementApiConfigured,
} from "@/lib/logto/management";

/**
 * Send Invite — emailing someone a link that signs them up and links them to
 * the inviter's referral (see lib/billing/referrals.ts).
 */

/** Invites one inviter may create in any rolling 24 hours. */
export const INVITE_DAILY_LIMIT = 15;

/** How long an invite link stays valid. */
export const INVITE_TTL_DAYS = 14;

const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Where invite links point. Always the production origin, never a preview URL:
 * an invite outlives the deployment that sent it, so a per-deployment host
 * would break every link as soon as that deployment was superseded. */
const INVITE_BASE_URL = "https://platform.lightriderinc.com";

export function inviteLink(token: string): string {
  return `${INVITE_BASE_URL}/invite?token=${encodeURIComponent(token)}`;
}

export type CreateInviteResult =
  | { status: "ok"; invite: Invite; remainingToday: number }
  | { status: "already_member"; message: string }
  | { status: "self_invite"; message: string }
  | { status: "rate_limited"; message: string }
  | { status: "invalid_email"; message: string }
  | {
      status: "email_failed";
      message: string;
      /** The invite row IS kept — only the send failed, so it can be retried. */
      invite: Invite;
      detail?: string;
    }
  | { status: "error"; message: string; cause: "caller" | "server"; detail?: string };

/** Invites this inviter has created inside the rolling window. */
export async function invitesUsedToday(customerId: string): Promise<number> {
  return db.invite.count({
    where: {
      inviterCustomerId: customerId,
      createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) },
    },
  });
}

/**
 * Creates an Invite plus its linked Referral, then emails the link.
 *
 * Order is deliberate. Everything that can reject the request — bad address,
 * self-invite, existing member, rate limit, unconfigured mail — is checked
 * BEFORE any row is written, so a refused invite never consumes quota and
 * never leaves an orphan record.
 *
 * The one exception is a Postmark failure, which happens after the rows
 * exist. Those rows are deliberately KEPT rather than rolled back: the token
 * is valid and the referral is real, so the right recovery is resending, not
 * re-creating. The caller is told clearly that the mail did not go out.
 */
export async function createAndSendInvite(
  inviter: Customer,
  rawEmail: string,
): Promise<CreateInviteResult> {
  const email = rawEmail.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return {
      status: "invalid_email",
      message: "Enter a valid email address.",
    };
  }

  // Compared case-insensitively on the address, because at this point there
  // is no account to compare ids with — unlike credit transfers, where the
  // recipient always resolves to a Customer row first.
  if (inviter.email && inviter.email.trim().toLowerCase() === email) {
    return {
      status: "self_invite",
      message: "That's your own email address — you already have an account.",
    };
  }

  if (!isManagementApiConfigured()) {
    console.error(
      "[invite] Logto Management API is not configured; cannot check for existing accounts.",
    );
    return {
      status: "error",
      cause: "server",
      message: "Invites are temporarily unavailable. Please try again later.",
    };
  }

  // Checked before mail config so "already a member" — which creates nothing
  // and costs no quota — still answers correctly on a deployment with no
  // Postmark credentials.
  let existing;
  try {
    existing = await findUserByPrimaryEmail(email);
  } catch (err) {
    console.error("[invite] Logto user lookup failed:", err);
    return {
      status: "error",
      cause: "server",
      message: "Couldn't check that address right now. Please try again.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (existing) {
    // Deliberately no Invite row: this doesn't count against the daily limit,
    // because nothing was sent.
    return {
      status: "already_member",
      message: "That person already has a Light Rider account.",
    };
  }

  if (!isEmailConfigured()) {
    console.error(
      "[invite] POSTMARK_SERVER_TOKEN / POSTMARK_FROM_EMAIL are not configured; refusing to create an invite that cannot be sent.",
    );
    return {
      status: "error",
      cause: "server",
      message: "Invites are temporarily unavailable. Please try again later.",
    };
  }

  const used = await invitesUsedToday(inviter.id);
  if (used >= INVITE_DAILY_LIMIT) {
    return {
      status: "rate_limited",
      message: "You've reached today's invite limit, try again tomorrow.",
    };
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Invite and Referral are written together: a referral with no invite is
  // unreachable, and an invite with no referral would sign someone up with no
  // reward attached and no way to notice.
  const invite = await db.$transaction(async (tx) => {
    const created = await tx.invite.create({
      data: { inviterCustomerId: inviter.id, email, token, expiresAt },
    });

    await tx.referral.create({
      data: {
        referrerCustomerId: inviter.id,
        inviteToken: token,
        status: "pending",
      },
    });

    return created;
  });

  const inviterName = inviter.email ?? "A Light Rider user";

  try {
    await sendEmail({
      to: email,
      subject: `${inviterName} invited you to Light Rider`,
      textBody: [
        `${inviterName} invited you to Light Rider.`,
        "",
        "Light Rider gives you access to real quantum hardware, quantum randomness, and the tools to build on them.",
        "",
        inviteLink(token),
        "",
        // Sets expectations before they hit the lock. A new account's free
        // credits don't cover real hardware, and discovering that only after
        // signing up reads as a bait-and-switch.
        "Simulators are free to use the moment you sign up. Running on real quantum hardware needs credits, which you can buy once you're in.",
        "",
        `This link expires in ${INVITE_TTL_DAYS} days.`,
      ].join("\n"),
    });
  } catch (err) {
    console.error(`[invite] Postmark send failed for invite ${invite.id}:`, err);
    return {
      status: "email_failed",
      message:
        "The invite was created but the email couldn't be sent. Please try again.",
      invite,
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    status: "ok",
    invite,
    remainingToday: Math.max(0, INVITE_DAILY_LIMIT - (used + 1)),
  };
}

export type InviteTokenResult =
  | { status: "valid"; invite: Invite }
  | { status: "expired" }
  | { status: "not_found" }
  | { status: "already_accepted" };

/**
 * Resolves an invite token from a link.
 *
 * Expiry is evaluated against `expiresAt` rather than trusting `status`,
 * because nothing sweeps rows to "expired" on a schedule — the column is the
 * authority and the status is a cache of it.
 */
export async function resolveInviteToken(
  token: string,
): Promise<InviteTokenResult> {
  if (!token) return { status: "not_found" };

  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite) return { status: "not_found" };
  if (invite.status === "accepted") return { status: "already_accepted" };
  if (invite.expiresAt.getTime() <= Date.now()) return { status: "expired" };

  return { status: "valid", invite };
}
