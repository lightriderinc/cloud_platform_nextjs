import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { db } from "@/lib/billing/db";
import {
  INVITE_DAILY_LIMIT,
  createAndSendInvite,
  invitesUsedToday,
} from "@/lib/billing/invites";
import { REFERRAL_REWARD_PREFIX } from "@/lib/billing/referrals";
import { NextResponse } from "next/server";

/**
 * GET  /api/invites?view=invites|rewards&page=1  — the caller's invite history
 * POST /api/invites                              — create and send one invite
 *
 * Responses follow the same `{ error, message }` shape as the rest of
 * /api/billing, so existing client helpers reading `data.error` keep working.
 */

const PAGE_SIZE = 10;

export async function GET(req: Request) {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = new URL(req.url);
  const view = url.searchParams.get("view") === "rewards" ? "rewards" : "invites";
  const pageParam = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const customer = await getOrCreateCustomer(user.sub, user.email);
  const usedToday = await invitesUsedToday(customer.id);

  const quota = {
    usedToday,
    limit: INVITE_DAILY_LIMIT,
    remainingToday: Math.max(0, INVITE_DAILY_LIMIT - usedToday),
  };

  if (view === "rewards") {
    // Referrals this customer earned as the REFERRER. The referee's own
    // reward row is on their ledger, not in this list.
    const referrals = await db.referral.findMany({
      where: { referrerCustomerId: customer.id, status: "rewarded" },
      orderBy: { rewardedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    });

    const hasMore = referrals.length > PAGE_SIZE;
    const rows = referrals.slice(0, PAGE_SIZE);

    // Invite rows carry the invitee's email; referrals only link by token.
    const invites = await db.invite.findMany({
      where: { token: { in: rows.map((r) => r.inviteToken ?? "") } },
    });
    const emailByToken = new Map(invites.map((i) => [i.token, i.email]));

    return NextResponse.json({
      view,
      page,
      pageSize: PAGE_SIZE,
      hasMore,
      quota,
      rewards: rows.map((referral) => ({
        id: referral.id,
        email: referral.inviteToken
          ? (emailByToken.get(referral.inviteToken) ?? null)
          : null,
        rewardCents: referral.rewardCents,
        qualifyingEventReason: referral.qualifyingEventReason,
        rewardedAt: referral.rewardedAt?.toISOString() ?? null,
        reason: `${REFERRAL_REWARD_PREFIX}${referral.id}`,
      })),
    });
  }

  const invites = await db.invite.findMany({
    where: { inviterCustomerId: customer.id },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  const hasMore = invites.length > PAGE_SIZE;
  const rows = invites.slice(0, PAGE_SIZE);

  // Rewards are looked up per invite so an accepted invite can show what it
  // actually earned, rather than just "accepted".
  const referrals = await db.referral.findMany({
    where: { inviteToken: { in: rows.map((i) => i.token) } },
  });
  const referralByToken = new Map(
    referrals.map((r) => [r.inviteToken ?? "", r]),
  );

  return NextResponse.json({
    view,
    page,
    pageSize: PAGE_SIZE,
    hasMore,
    quota,
    invites: rows.map((invite) => {
      const referral = referralByToken.get(invite.token);
      // Expiry is derived from expiresAt, not from `status` — nothing sweeps
      // rows to "expired" on a schedule, so the column is the authority.
      const isExpired =
        invite.status === "pending" && invite.expiresAt.getTime() <= Date.now();
      return {
        id: invite.id,
        email: invite.email,
        status: isExpired ? "expired" : invite.status,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt.toISOString(),
        rewardCents:
          referral?.status === "rewarded" ? (referral.rewardCents ?? null) : null,
      };
    }),
  });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "error", message: "Invalid request body." },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email : "";
  const inviter = await getOrCreateCustomer(user.sub, user.email);
  const result = await createAndSendInvite(inviter, email);

  const withDetail = (payload: Record<string, unknown>, detail?: string) =>
    detail && process.env.VERCEL_ENV !== "production"
      ? { ...payload, detail }
      : payload;

  switch (result.status) {
    case "ok":
      return NextResponse.json({
        ok: true,
        email: result.invite.email,
        expiresAt: result.invite.expiresAt.toISOString(),
        remainingToday: result.remainingToday,
      });

    case "already_member":
      return NextResponse.json(
        { error: "already_member", message: result.message },
        { status: 409 },
      );

    case "self_invite":
    case "invalid_email":
      return NextResponse.json(
        { error: result.status, message: result.message },
        { status: 400 },
      );

    case "rate_limited":
      return NextResponse.json(
        { error: "rate_limited", message: result.message },
        { status: 429 },
      );

    case "email_failed":
      // 502, not 500: the invite exists and is valid — only the delivery
      // failed, and the user should retry the send rather than assume nothing
      // happened.
      return NextResponse.json(
        withDetail(
          { error: "email_failed", message: result.message },
          result.detail,
        ),
        { status: 502 },
      );

    case "error":
      return NextResponse.json(
        withDetail({ error: "error", message: result.message }, result.detail),
        { status: result.cause === "caller" ? 400 : 500 },
      );
  }
}
