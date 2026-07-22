import Stripe from "stripe";

// Server-only. Never import this from a client component.
const secretKey = process.env.STRIPE_SECRET_KEY;

// Without a real key, this still constructs the client so imports don't
// crash the app (or the build) — any actual call will fail loudly with
// Stripe's own auth error, which is the right failure mode until Tony/Jake
// share keys.
export const stripe = new Stripe(secretKey ?? "sk_test_placeholder", {
  apiVersion: "2026-06-24.dahlia",
  appInfo: { name: "light-rider-cloud-platform" },
});
