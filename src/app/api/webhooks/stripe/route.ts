import { db } from "@/lib/billing/db";
import { findApiPlanByPriceId, findUserPlanByPriceId } from "@/lib/billing/plans";
import { assignRoleToUser, revokeRoleFromUser } from "@/lib/logto/management";
import { stripe } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

// Stripe requires the raw request body (unparsed) to verify the signature.
export const runtime = "nodejs";

/**
 * Single webhook endpoint for all four pricing flows. Each event is
 * idempotency-checked against ProcessedStripeEvent before being applied, so
 * Stripe's automatic retries never double-credit or double-provision.
 *
 * Register this URL in the Stripe Dashboard (or via CLI for local dev:
 * `stripe listen --forward-to localhost:3000/api/webhooks/stripe`) and put
 * the signing secret it gives you into STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook is not configured (missing signature or secret)." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] signature verification failed:", detail);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Idempotency: if we've already processed this event id, ack and stop.
  const already = await db.processedStripeEvent.findUnique({
    where: { id: event.id },
  });
  if (already) {
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    // Log and 500 so Stripe retries — better to reprocess than silently drop.
    console.error(`[stripe-webhook] failed to handle ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  await db.processedStripeEvent.create({
    data: { id: event.id, type: event.type },
  });

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscription(subscription);
      await grantIncludedCreditsIfApplicable(subscription, event.id);
      await syncProRoleForActiveSubscription(subscription);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscription(subscription);
      await syncProRoleForActiveSubscription(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: "canceled" },
      });

      // Validation flow: the subscription actually ended, so the Pro role
      // shouldn't stay unlocked. Rethrow on failure so Stripe retries.
      if (subscription.metadata?.kind === "validation") {
        const customer = await db.customer.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        });
        if (!customer) {
          console.warn(
            `[stripe-webhook] no local Customer for stripeCustomerId=${subscription.customer}; skipping role revoke.`,
          );
          break;
        }

        // A customer can hold more than one active plan (e.g. a User Pricing
        // plan alongside the validation subscription) — only revoke Pro if
        // nothing else keeps it earned.
        const otherActiveSubscription = await db.subscription.findFirst({
          where: {
            customerId: customer.id,
            stripeSubscriptionId: { not: subscription.id },
            status: { in: ["active", "trialing"] },
          },
        });
        if (otherActiveSubscription) {
          break;
        }

        try {
          await revokeRoleFromUser(
            customer.logtoUserId,
            process.env.LOGTO_PRO_ROLE_ID as string,
          );
        } catch (err) {
          console.error(
            `[stripe-webhook] failed to revoke Logto role from ${customer.logtoUserId}:`,
            err,
          );
          throw err;
        }
      }
      break;
    }

    default:
      // Unhandled event types are fine to ignore — we still record them as
      // processed so we don't re-inspect them on retry.
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const kind = session.metadata?.kind;
  const logtoUserId = session.metadata?.logtoUserId;

  if (!logtoUserId) {
    console.warn(
      `[stripe-webhook] checkout.session.completed (${session.id}) missing logtoUserId metadata; skipping.`,
    );
    return;
  }

  const customer = await db.customer.findUnique({ where: { logtoUserId } });
  if (!customer) {
    console.warn(
      `[stripe-webhook] no local Customer for logtoUserId=${logtoUserId}; skipping.`,
    );
    return;
  }

  // Quantum Compute Pricing: one-time payment -> credit the ledger.
  if (kind === "credits" && session.mode === "payment") {
    const amountCents = session.amount_total ?? 0;
    await db.$transaction([
      db.creditLedgerEntry.create({
        data: {
          customerId: customer.id,
          amountCents,
          reason: `checkout:${session.id}`,
          stripeEventId: session.id,
        },
      }),
      db.customer.update({
        where: { id: customer.id },
        data: { creditsBalanceCents: { increment: amountCents } },
      }),
    ]);
    return;
  }

  // User Pricing / API Pricing: subscription checkout. The subscription
  // itself is synced by the customer.subscription.* handlers below, which
  // fire right alongside this event — nothing further to do here.
}

async function upsertSubscription(subscription: Stripe.Subscription) {
  const kindRaw = subscription.metadata?.kind;
  const kind = kindRaw === "api_plan" ? "API_PLAN" : "USER_PLAN";

  const customer = await db.customer.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });
  if (!customer) {
    console.warn(
      `[stripe-webhook] no local Customer for stripeCustomerId=${subscription.customer}; skipping subscription sync.`,
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? "";
  const currentPeriodStart = subscription.items.data[0]?.current_period_start;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  const resolvedTier =
    kind === "API_PLAN"
      ? findApiPlanByPriceId(priceId)
      : findUserPlanByPriceId(priceId);

  await db.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      customerId: customer.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      kind,
      tier: resolvedTier?.tier ?? null,
      status: subscription.status,
      currentPeriodStart: currentPeriodStart
        ? new Date(currentPeriodStart * 1000)
        : null,
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripePriceId: priceId,
      tier: resolvedTier?.tier ?? null,
      status: subscription.status,
      currentPeriodStart: currentPeriodStart
        ? new Date(currentPeriodStart * 1000)
        : null,
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

/**
 * User Pricing plans include a bucket of Quantum Compute credits on
 * subscription creation. Only called from customer.subscription.created, so
 * this fires once per subscription; the ledger's unique stripeEventId column
 * (keyed to the webhook event, not the subscription) makes it idempotent
 * against Stripe retries on top of the outer webhook dedup.
 */
async function grantIncludedCreditsIfApplicable(
  subscription: Stripe.Subscription,
  stripeEventId: string,
) {
  if (subscription.metadata?.kind !== "user_plan") {
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? "";
  const plan = findUserPlanByPriceId(priceId);
  if (!plan || plan.includedCreditsUsd <= 0) {
    return;
  }

  const customer = await db.customer.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });
  if (!customer) {
    console.warn(
      `[stripe-webhook] no local Customer for stripeCustomerId=${subscription.customer}; skipping credit grant.`,
    );
    return;
  }

  const amountCents = plan.includedCreditsUsd * 100;
  await db.$transaction([
    db.creditLedgerEntry.create({
      data: {
        customerId: customer.id,
        amountCents,
        reason: `plan_credit:${subscription.id}`,
        stripeEventId,
      },
    }),
    db.customer.update({
      where: { id: customer.id },
      data: { creditsBalanceCents: { increment: amountCents } },
    }),
  ]);
}

/**
 * Keeps the Logto Pro role in sync with subscription status. Rethrow on
 * failure so Stripe retries the webhook instead of us silently dropping the
 * grant.
 */
async function syncProRoleForActiveSubscription(subscription: Stripe.Subscription) {
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return;
  }

  const customer = await db.customer.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });
  if (!customer) {
    console.warn(
      `[stripe-webhook] no local Customer for stripeCustomerId=${subscription.customer}; skipping role grant.`,
    );
    return;
  }

  try {
    await assignRoleToUser(
      customer.logtoUserId,
      process.env.LOGTO_PRO_ROLE_ID as string,
    );
  } catch (err) {
    console.error(
      `[stripe-webhook] failed to assign Logto role to ${customer.logtoUserId}:`,
      err,
    );
    throw err;
  }
}
