import { db } from "@/lib/billing/db";
import { stripe } from "@/lib/stripe/client";

/**
 * Reports one metered API call against a customer's overage meter.
 *
 * IMPORTANT: this is a library function, not a route — it needs to be
 * called from wherever EaaS API requests are actually authenticated and
 * served. That's the entropy API gateway (owned by the EMS/backend team,
 * outside this Next.js repo), not this app. This function exists so that
 * integration is a single call once that gateway can reach this app (or a
 * shared package), rather than everyone re-deriving the Stripe meter
 * event shape.
 *
 * STRIPE_METER_EVENT_NAME must match the meter's event_name configured in
 * the Stripe Dashboard when the "EaaS API calls" meter is created.
 */
export async function reportApiUsage(stripeCustomerId: string, quantity = 1) {
  const meterEventName = process.env.STRIPE_METER_EVENT_NAME;
  if (!meterEventName) {
    throw new Error("STRIPE_METER_EVENT_NAME is not configured.");
  }

  const event = await stripe.billing.meterEvents.create({
    event_name: meterEventName,
    payload: {
      stripe_customer_id: stripeCustomerId,
      value: String(quantity),
    },
  });

  const customer = await db.customer.findUnique({
    where: { stripeCustomerId },
  });
  if (customer) {
    await db.apiUsageEvent.create({
      data: {
        customerId: customer.id,
        stripeEventId: event.identifier,
        quantity,
      },
    });
  }

  return event;
}
