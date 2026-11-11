import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { IonqQuoteError, quoteIonqJob } from "@/lib/quantum/ionqPricing";
import { isPricedPerJob, isValidBackend, QUANTUM_BACKENDS } from "@/lib/quantum/backends";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/lr/quantum/estimate  { backend, circuit, shots }
 *
 * The credit price of one job on a per-job priced backend (IonQ Forte),
 * shown to the user before they confirm. Charges nothing and submits
 * nothing. The submit route re-quotes server-side and never trusts this
 * response, so the only thing a client can do with it is display it.
 *
 * Same auth as submit: a Logto session or a bearer API key. Returns
 * { priceCredits, balanceCredits }; never IonQ's own USD estimate or the
 * markup.
 */
export async function POST(req: Request) {
  const customer = await resolveCustomerFromRequest(req, { createIfMissing: true });
  if (!customer) {
    return NextResponse.json({ error: "Not signed in, and no valid API key provided." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { backend, circuit, shots } = body as { backend?: string; circuit?: unknown; shots?: number };

  if (!backend || !isValidBackend(backend) || !isPricedPerJob(backend)) {
    return NextResponse.json(
      { error: "Price estimates are only for backends priced per job (IonQ Forte)." },
      { status: 400 },
    );
  }

  try {
    const { priceCredits } = await quoteIonqJob(QUANTUM_BACKENDS[backend].deviceInstance, circuit, shots ?? 1);
    return NextResponse.json({ backend, shots: shots ?? 1, priceCredits, balanceCredits: customer.creditsBalanceCents });
  } catch (err) {
    if (err instanceof IonqQuoteError) {
      return NextResponse.json({ error: "estimate_failed", message: err.message }, { status: err.status });
    }
    throw err;
  }
}
