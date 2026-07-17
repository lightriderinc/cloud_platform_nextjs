import Stripe from "stripe";

// Server-only. Never import this from a client component.
const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey && process.env.NODE_ENV === "production") {
  throw new Error("STRIPE_SECRET_KEY is not configured.");
}

// In dev without a key yet, this still constructs the client so imports
// don't crash the app; any actual call will fail loudly with Stripe's own
// auth error, which is the right failure mode until Tony/Jake share keys.
export const stripe = new Stripe(secretKey ?? "sk_test_placeholder", {
  apiVersion: "2026-06-24.dahlia",
  appInfo: { name: "light-rider-cloud-platform" },
});
