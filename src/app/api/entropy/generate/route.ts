import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

const KNOWN_SOURCES = [
  "nist-beacon",
  "rdseed",
  "curby",
  "iqm-resonance",
  "quantum-light-lab",
];

/**
 * POST /api/entropy/generate
 *
 * Mock entropy backend for the Dashboard's "Get Entropy" demo — every
 * source currently resolves to the same server-side CSPRNG
 * (crypto.randomBytes), same spirit as iqm-proxy running against
 * garnet:mock rather than real hardware: the request actually leaves the
 * browser and gets a real server response, but the underlying "source"
 * isn't real yet. The requested source is still recorded (not silently
 * dropped) so swapping in real per-source generation later doesn't need
 * another change to the request shape.
 *
 * Deliberately NOT gated (no Pro check, no credit deduction, no
 * resolveCustomerFromRequest) — see the accompanying report on why: this
 * app's own pricing design already treats entropy as a separate "EaaS API
 * Pricing" product (usage-metered per call, its own Free/Starter/Developer/
 * Business tiers — see src/lib/billing/plans.ts's API_PLANS and
 * src/app/pricing/api/page.tsx), not the same Pro+prepaid-credit model as
 * quantum circuit jobs. No enforcement for that EaaS tier exists anywhere
 * in this app yet (reportApiUsage in billing/meter.ts has no callers — it's
 * designed for an external gateway), so this route doesn't invent
 * Pro/credit gating that belongs to a different, not-yet-built product.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const source = typeof body.source === "string" ? body.source : "unknown";
  const bytes = Number(body.bytes);

  if (!Number.isInteger(bytes) || bytes < 1 || bytes > 4096) {
    return NextResponse.json(
      { error: "bytes must be an integer between 1 and 4096." },
      { status: 400 },
    );
  }

  console.log(`[entropy] mock generation requested — source="${source}" bytes=${bytes}`);
  if (!KNOWN_SOURCES.includes(source)) {
    console.warn(`[entropy] unrecognized source "${source}" — generating anyway via the mock generator.`);
  }

  const hex = randomBytes(bytes).toString("hex");

  return NextResponse.json({
    source,
    bytes,
    hex,
    generatedAt: new Date().toISOString(),
  });
}
