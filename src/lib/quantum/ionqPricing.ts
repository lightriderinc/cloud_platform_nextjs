// Per-job pricing for IonQ's Forte QPUs (QUANTUM_BACKENDS entries with
// pricedPerJob). Server-only: it calls qpu-proxy with the service key.
//
// price in credits = ceil(IonQ's USD estimate x 100 x IONQ_PRICE_MARKUP),
// at least 1. Credits are 1:1 with cents, the same unit as every other
// creditsBalanceCents / CreditLedgerEntry amount. The USD estimate and the
// markup never leave the server; callers only ever see the credit price.

export const DEFAULT_IONQ_PRICE_MARKUP = 1.3;

/**
 * IONQ_PRICE_MARKUP, defaulting to 1.3. A missing, unparseable or below-1
 * value falls back to the default: below 1 would sell Forte time under cost,
 * which is far more likely a typo (0.13 for 1.3) than a decision.
 */
export function ionqPriceMarkup(raw: string | undefined = process.env.IONQ_PRICE_MARKUP): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_IONQ_PRICE_MARKUP;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    console.warn(`[ionq-pricing] ignoring IONQ_PRICE_MARKUP=${JSON.stringify(raw)}; using ${DEFAULT_IONQ_PRICE_MARKUP}`);
    return DEFAULT_IONQ_PRICE_MARKUP;
  }
  return value;
}

/** Whole credits for a USD estimate. Rounded to 6 places first so 0.29 x 100 x 1.3 (37.699999...) can't round up a whole credit by float noise. Never below 1. */
export function priceCreditsFromEstimate(estimatedCostUsd: number, markup: number): number {
  const cents = Math.round(estimatedCostUsd * 100 * markup * 1e6) / 1e6;
  return Math.max(1, Math.ceil(cents));
}

/** A quote that couldn't be produced. `status` is the HTTP status to return; `message` is safe to show the user. */
export class IonqQuoteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "IonqQuoteError";
  }
}

export interface IonqQuote {
  priceCredits: number;
}

/**
 * Prices one job by asking qpu-proxy's POST /jobs/estimate (same body as a
 * submit). Throws IonqQuoteError with a user-facing message for every way
 * that can fail, including IonQ answering in a unit other than USD, which
 * we can't convert.
 */
export async function quoteIonqJob(
  deviceInstance: string,
  circuit: unknown,
  shots: number,
  fetchImpl: typeof fetch = fetch,
): Promise<IonqQuote> {
  const res = await fetchImpl(`${process.env.QUANTUM_PROXY_URL}/jobs/estimate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}`,
    },
    body: JSON.stringify({ circuit, shots, device_instance: deviceInstance }),
    signal: AbortSignal.timeout(20_000),
  }).catch((err) => {
    console.error("[ionq-pricing] qpu-proxy unreachable:", err);
    return null;
  });

  if (!res) {
    throw new IonqQuoteError("Pricing is unavailable right now. Try again in a moment.", 502);
  }
  if (!res.ok) {
    const body: Record<string, unknown> = await res.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail : "";
    console.error(`[ionq-pricing] estimate failed (HTTP ${res.status}): ${detail}`);
    if (res.status === 503) {
      throw new IonqQuoteError(
        "This IonQ system is unavailable right now, for example during maintenance. Try again later.",
        503,
      );
    }
    if (res.status === 400) {
      throw new IonqQuoteError(`This job can't be priced: ${detail || "IonQ rejected the request."}`, 400);
    }
    throw new IonqQuoteError("Pricing is unavailable right now. Try again in a moment.", 502);
  }

  const data: Record<string, unknown> = await res.json().catch(() => ({}));
  const usd = data.estimated_cost_usd;
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd < 0) {
    console.error("[ionq-pricing] estimate had no USD figure:", JSON.stringify(data).slice(0, 500));
    throw new IonqQuoteError("IonQ didn't return a price for this job, so it can't be submitted right now.", 502);
  }
  return { priceCredits: priceCreditsFromEstimate(usd, ionqPriceMarkup()) };
}
