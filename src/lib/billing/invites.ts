import { randomUUID } from "crypto";
import type { Customer, Invite } from "@prisma/client";
import { db } from "@/lib/billing/db";
import { renderInviteEmail } from "@/lib/email/inviteEmail";
import { isEmailConfigured, sendEmail } from "@/lib/email/postmark";
import {
  findUserByPrimaryEmail,
  isManagementApiConfigured,
} from "@/lib/logto/management";

/**
 * Send Invite — emailing someone a link that signs them up and links them to
 * the inviter's referral (see lib/billing/referrals.ts).
 *
 * ONE CODE PATH. A single invite is a batch of one row, mirroring
 * transferCredits.ts — there is no separate single-invite implementation.
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

/** Invites this inviter has created inside the rolling window. */
export async function invitesUsedToday(customerId: string): Promise<number> {
  return db.invite.count({
    where: {
      inviterCustomerId: customerId,
      createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) },
    },
  });
}

/** Per-row outcome. Every submitted row gets exactly one of these back. */
export type InviteRowResult =
  | { status: "ok"; email: string; expiresAt: string }
  | { status: "already_member"; email: string }
  | { status: "already_invited"; email: string; expiresAt: string }
  | { status: "self_invite"; email: string }
  | { status: "invalid_email"; email: string }
  | { status: "email_failed"; email: string; message: string }
  | { status: "lookup_failed"; email: string; message: string };

export type SendInvitesResult =
  | {
      status: "ok";
      rows: InviteRowResult[];
      /** How many rows actually created an invite and consumed quota. */
      sentCount: number;
      remainingToday: number;
    }
  | {
      status: "rate_limited";
      message: string;
      usedToday: number;
      limit: number;
    }
  | { status: "too_many_rows"; message: string }
  | { status: "no_rows"; message: string }
  | {
      status: "error";
      message: string;
      cause: "caller" | "server";
      detail?: string;
    };

/**
 * Merges duplicate addresses in one submission, case-insensitively — the same
 * rule Logto uses when comparing email identifiers, and the same behaviour
 * dedupeRows() gives Share Credits. Listing one person twice in one go is a
 * slip, not a request to send them two emails.
 */
export function dedupeEmails(emails: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of emails) {
    const email = raw.trim();
    const key = email.toLowerCase();
    if (key !== "" && !seen.has(key)) seen.set(key, email);
  }
  return [...seen.values()];
}

/**
 * Validates, resolves and sends a whole batch of invites.
 *
 * QUOTA. The daily limit is checked ONCE, upfront, against the number of
 * submitted rows — if `usedToday + rows > INVITE_DAILY_LIMIT` the entire batch
 * is refused and nothing is sent. Same discipline as Share Credits refusing an
 * unaffordable batch outright: sending the first eight of someone's twelve and
 * stopping is the behaviour that actually confuses people.
 *
 * The check is deliberately conservative. Rows that turn out to be existing
 * members create nothing and consume nothing, so real usage can end up lower
 * than the figure the batch was measured against — erring toward refusing a
 * batch that would have just fit, rather than overshooting the limit.
 */
export async function createAndSendInvites(
  inviter: Customer,
  rawEmails: string[],
  inviterName: string,
): Promise<SendInvitesResult> {
  const emails = dedupeEmails(rawEmails);

  if (emails.length === 0) {
    return { status: "no_rows", message: "Add at least one email address." };
  }

  if (emails.length > INVITE_DAILY_LIMIT) {
    return {
      status: "too_many_rows",
      message: `You can invite at most ${INVITE_DAILY_LIMIT} people at once.`,
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

  if (!isEmailConfigured()) {
    console.error(
      "[invite] POSTMARK_SERVER_TOKEN / POSTMARK_FROM_EMAIL are not configured; refusing to create invites that cannot be sent.",
    );
    return {
      status: "error",
      cause: "server",
      message: "Invites are temporarily unavailable. Please try again later.",
    };
  }

  const usedToday = await invitesUsedToday(inviter.id);
  if (usedToday + emails.length > INVITE_DAILY_LIMIT) {
    const remaining = Math.max(0, INVITE_DAILY_LIMIT - usedToday);
    return {
      status: "rate_limited",
      message:
        remaining === 0
          ? "You've reached today's invite limit, try again tomorrow."
          : `That's ${emails.length} invites but you only have ${remaining} left today. Nothing was sent.`,
      usedToday,
      limit: INVITE_DAILY_LIMIT,
    };
  }

  const inviterEmail = inviter.email?.trim().toLowerCase() ?? null;
  const rows: InviteRowResult[] = [];
  let sentCount = 0;

  for (const original of emails) {
    const email = original.toLowerCase();

    if (!email.includes("@")) {
      rows.push({ status: "invalid_email", email: original });
      continue;
    }

    // Compared on the address, not on a Customer id: at this point there is
    // no account to compare ids with, unlike a credit transfer.
    if (inviterEmail && inviterEmail === email) {
      rows.push({ status: "self_invite", email: original });
      continue;
    }

    let existing;
    try {
      existing = await findUserByPrimaryEmail(email);
    } catch (err) {
      console.error(`[invite] Logto user lookup failed for ${email}:`, err);
      rows.push({
        status: "lookup_failed",
        email: original,
        message: "Couldn't check that address right now.",
      });
      continue;
    }

    if (existing) {
      // No Invite row is written, so no quota is consumed. This holds per row
      // inside a batch exactly as it did for a single invite.
      rows.push({ status: "already_member", email: original });
      continue;
    }

    // An unexpired invite already outstanding for this pair means a resend
    // would double-mail the recipient and burn a second slot. Report the
    // existing one instead. This also makes a retried submit largely
    // harmless, which matters because there is no idempotency key here.
    const outstanding = await db.invite.findFirst({
      where: {
        inviterCustomerId: inviter.id,
        email,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });
    if (outstanding) {
      rows.push({
        status: "already_invited",
        email: original,
        expiresAt: outstanding.expiresAt.toISOString(),
      });
      continue;
    }

    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    // Invite and Referral are written together: a referral with no invite is
    // unreachable, and an invite with no referral would sign someone up with
    // no reward attached and nothing to notice it.
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

    sentCount += 1;

    const { subject, textBody, htmlBody } = renderInviteEmail({
      inviterName,
      inviteUrl: inviteLink(token),
      ttlDays: INVITE_TTL_DAYS,
    });

    try {
      await sendEmail({ to: email, subject, textBody, htmlBody });
    } catch (err) {
      console.error(
        `[invite] Postmark send failed for invite ${invite.id}:`,
        err,
      );
      // The rows are KEPT deliberately: the token is valid and the referral is
      // real, so the recovery is resending, not re-creating. It still counted
      // against quota, because an invite genuinely does exist.
      rows.push({
        status: "email_failed",
        email: original,
        message: "Created, but the email couldn't be sent.",
      });
      continue;
    }

    rows.push({
      status: "ok",
      email: original,
      expiresAt: invite.expiresAt.toISOString(),
    });
  }

  return {
    status: "ok",
    rows,
    sentCount,
    remainingToday: Math.max(0, INVITE_DAILY_LIMIT - (usedToday + sentCount)),
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
