import { getDisplayName, requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { db } from "@/lib/billing/db";
import {
  INVITE_DAILY_LIMIT,
  createAndSendInvites,
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
    // BOTH sides of a rewarded referral. "Rewards earned" has to mean what it
    // says: the referee is paid the same 100 credits as the referrer, and
    // before this their only trace of it was a "Referral reward" line buried
    // in Share Credits history — a page someone who joined by invite has no
    // reason to open.
    const referrals = await db.referral.findMany({
      where: {
        status: "rewarded",
        OR: [
          { referrerCustomerId: customer.id },
          { refereeCustomerId: customer.id },
        ],
      },
      orderBy: { rewardedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    });

    const hasMore = referrals.length > PAGE_SIZE;
    const rows = referrals.slice(0, PAGE_SIZE);

    // The counterparty differs by side: as referrer it is the person you
    // invited (carried on the Invite row, since Referral only links by token);
    // as referee it is whoever invited you (a Customer).
    const [invites, referrers] = await Promise.all([
      db.invite.findMany({
        where: {
          token: { in: rows.map((r) => r.inviteToken).filter((t): t is string => !!t) },
        },
      }),
      db.customer.findMany({
        where: { id: { in: rows.map((r) => r.referrerCustomerId) } },
        select: { id: true, email: true },
      }),
    ]);
    const inviteeByToken = new Map(invites.map((i) => [i.token, i.email]));
    const referrerById = new Map(referrers.map((c) => [c.id, c.email]));

    return NextResponse.json({
      view,
      page,
      pageSize: PAGE_SIZE,
      hasMore,
      quota,
      rewards: rows.map((referral) => {
        const side =
          referral.referrerCustomerId === customer.id ? "referrer" : "referee";
        return {
          id: referral.id,
          side,
          counterpartyEmail:
            side === "referrer"
              ? (referral.inviteToken
                  ? (inviteeByToken.get(referral.inviteToken) ?? null)
                  : null)
              : (referrerById.get(referral.referrerCustomerId) ?? null),
          rewardCents: referral.rewardCents,
          qualifyingEventReason: referral.qualifyingEventReason,
          rewardedAt: referral.rewardedAt?.toISOString() ?? null,
          reason: `${REFERRAL_REWARD_PREFIX}${referral.id}`,
        };
      }),
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

  let body: { emails?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "error", message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.emails)) {
    return NextResponse.json(
      { error: "error", message: "Expected a list of email addresses." },
      { status: 400 },
    );
  }

  const emails = body.emails.map((raw) => (typeof raw === "string" ? raw : ""));

  const inviter = await getOrCreateCustomer(user.sub, user.email);

  // The email leads with the inviter by name. getDisplayName() reads the Logto
  // Account API and is best-effort, so it degrades to the address and then to
  // a generic phrase rather than ever printing "undefined invited you".
  const displayName = await getDisplayName().catch(() => null);
  const inviterName = displayName ?? inviter.email ?? "A Light Rider user";

  const result = await createAndSendInvites(inviter, emails, inviterName);

  const withDetail = (payload: Record<string, unknown>, detail?: string) =>
    detail && process.env.VERCEL_ENV !== "production"
      ? { ...payload, detail }
      : payload;

  switch (result.status) {
    case "ok":
      return NextResponse.json({
        ok: true,
        rows: result.rows,
        sentCount: result.sentCount,
        remainingToday: result.remainingToday,
      });

    case "rate_limited":
      return NextResponse.json(
        {
          error: "rate_limited",
          message: result.message,
          usedToday: result.usedToday,
          limit: result.limit,
        },
        { status: 429 },
      );

    case "too_many_rows":
      return NextResponse.json(
        { error: "too_many_rows", message: result.message },
        { status: 400 },
      );

    case "no_rows":
      return NextResponse.json(
        { error: "no_rows", message: result.message },
        { status: 400 },
      );

    case "error":
      return NextResponse.json(
        withDetail({ error: "error", message: result.message }, result.detail),
        { status: result.cause === "caller" ? 400 : 500 },
      );
  }
}
