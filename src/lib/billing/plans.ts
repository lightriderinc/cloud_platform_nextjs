// Central place to map the tiers shown in the pricing mockups to Stripe
// Price IDs. Price IDs are read from env because they differ between
// Stripe test mode and live mode, and Tony/Jake own the Stripe dashboard.
// Fill these in .env.local once products/prices exist — see
// BILLING_INTEGRATION.md for the exact list to create.

export type UserPlanTier = "starter" | "developer" | "professional";

export const USER_PLANS: Record<
  UserPlanTier,
  { name: string; priceEnvVar: string; monthlyUsd: number; includedCreditsUsd: number }
> = {
  starter: {
    name: "Starter",
    priceEnvVar: "STRIPE_PRICE_USER_STARTER",
    monthlyUsd: 99,
    includedCreditsUsd: 50,
  },
  developer: {
    name: "Developer",
    priceEnvVar: "STRIPE_PRICE_USER_DEVELOPER",
    monthlyUsd: 499,
    includedCreditsUsd: 250,
  },
  professional: {
    name: "Professional",
    priceEnvVar: "STRIPE_PRICE_USER_PROFESSIONAL",
    monthlyUsd: 2500,
    includedCreditsUsd: 1500,
  },
  // Enterprise has no self-serve price — routed to Contact Sales instead.
};

/** Resolves a User Pricing tier from a Stripe Price ID, or null if no tier matches. */
export function findUserPlanByPriceId(
  priceId: string,
): ({ tier: UserPlanTier } & (typeof USER_PLANS)[UserPlanTier]) | null {
  for (const tier of Object.keys(USER_PLANS) as UserPlanTier[]) {
    const plan = USER_PLANS[tier];
    if (process.env[plan.priceEnvVar] === priceId) {
      return { tier, ...plan };
    }
  }
  return null;
}

export type ApiPlanTier = "starter" | "developer" | "business";

export const API_PLANS: Record<
  ApiPlanTier,
  { name: string; priceEnvVar: string; monthlyUsd: number; callsIncluded: number }
> = {
  starter: {
    name: "Starter",
    priceEnvVar: "STRIPE_PRICE_API_STARTER",
    monthlyUsd: 99,
    callsIncluded: 250_000,
  },
  developer: {
    name: "Developer",
    priceEnvVar: "STRIPE_PRICE_API_DEVELOPER",
    monthlyUsd: 499,
    callsIncluded: 2_000_000,
  },
  business: {
    name: "Business",
    priceEnvVar: "STRIPE_PRICE_API_BUSINESS",
    monthlyUsd: 2500,
    callsIncluded: 15_000_000,
  },
  // Free plan has no Stripe price - provisioned without a subscription.
  // Enterprise is Contact Sales, same as User Pricing.
};

/** Resolves an API Pricing tier from a Stripe Price ID, or null if no tier matches. */
export function findApiPlanByPriceId(
  priceId: string,
): ({ tier: ApiPlanTier } & (typeof API_PLANS)[ApiPlanTier]) | null {
  for (const tier of Object.keys(API_PLANS) as ApiPlanTier[]) {
    const plan = API_PLANS[tier];
    if (process.env[plan.priceEnvVar] === priceId) {
      return { tier, ...plan };
    }
  }
  return null;
}

/** Resolves a tier's Stripe Price ID from env, throwing a clear error if unset. */
export function resolvePriceId(envVarName: string): string {
  const value = process.env[envVarName];
  if (!value) {
    throw new Error(
      `${envVarName} is not set. Create the Price in Stripe and add it to .env.local.`,
    );
  }
  return value;
}
