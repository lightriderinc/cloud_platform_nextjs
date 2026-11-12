import { afterEach, describe, expect, test, vi } from "vitest";
import {
  DEFAULT_IONQ_PRICE_MARKUP,
  IonqQuoteError,
  ionqNoisySimPricePerShotUsd,
  ionqPriceMarkup,
  noisySimPriceCredits,
  priceCreditsFromEstimate,
  quoteIonqJob,
} from "./ionqPricing";

// Offline only: quoteIonqJob gets an injected fetch; nothing reaches qpu-proxy.
const CIRCUIT = { num_qubits: 2, instructions: [{ name: "h", qubits: [0] }, { name: "cx", qubits: [0, 1] }] };

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("IONQ_PRICE_MARKUP", () => {
  test("defaults to 1.3", () => {
    expect(DEFAULT_IONQ_PRICE_MARKUP).toBe(1.3);
    expect(ionqPriceMarkup(undefined)).toBe(1.3);
    expect(ionqPriceMarkup("")).toBe(1.3);
  });

  test("uses a valid value", () => {
    expect(ionqPriceMarkup("1.5")).toBe(1.5);
    expect(ionqPriceMarkup("1")).toBe(1);
  });

  test("ignores unparseable or below-cost values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(ionqPriceMarkup("abc")).toBe(1.3);
    expect(ionqPriceMarkup("0.13")).toBe(1.3); // a typo for 1.3 must not sell below cost
    expect(ionqPriceMarkup("-2")).toBe(1.3);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  test("reads the env var", () => {
    vi.stubEnv("IONQ_PRICE_MARKUP", "2");
    expect(ionqPriceMarkup()).toBe(2);
  });
});

describe("IONQ_NOISY_SIM_PRICE_PER_SHOT_USD", () => {
  test("defaults to 0: the noisy simulator stays free", () => {
    expect(ionqNoisySimPricePerShotUsd(undefined)).toBe(0);
    expect(ionqNoisySimPricePerShotUsd("")).toBe(0);
    expect(ionqNoisySimPricePerShotUsd("0")).toBe(0);
    expect(noisySimPriceCredits(1000, 0)).toBe(0);
  });

  test("invalid or negative stays free", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(ionqNoisySimPricePerShotUsd("abc")).toBe(0);
    expect(ionqNoisySimPricePerShotUsd("-0.01")).toBe(0);
    warn.mockRestore();
  });

  test("above 0: shots x price x 100, rounded up, at least 1 credit", () => {
    expect(ionqNoisySimPricePerShotUsd("0.0003")).toBe(0.0003);
    expect(noisySimPriceCredits(1000, 0.0003)).toBe(30);
    expect(noisySimPriceCredits(1, 0.0003)).toBe(1);
    expect(noisySimPriceCredits(333, 0.001)).toBe(34); // 33.3 -> 34
  });

  test("reads the env var", () => {
    vi.stubEnv("IONQ_NOISY_SIM_PRICE_PER_SHOT_USD", "0.001");
    expect(noisySimPriceCredits(1000)).toBe(100);
  });
});

describe("priceCreditsFromEstimate", () => {
  test("USD x 100 x markup, rounded up to whole credits", () => {
    expect(priceCreditsFromEstimate(1, 1.3)).toBe(130);
    expect(priceCreditsFromEstimate(0.29, 1.3)).toBe(38); // 37.7 -> 38
    expect(priceCreditsFromEstimate(97.42, 1.3)).toBe(12665); // 12664.6 -> 12665
  });

  test("float noise never adds a credit", () => {
    // 0.1 x 100 x 1.3 is 13.000000000000002 in floating point.
    expect(priceCreditsFromEstimate(0.1, 1.3)).toBe(13);
  });

  test("never below 1 credit, so a QPU job is never free", () => {
    expect(priceCreditsFromEstimate(0, 1.3)).toBe(1);
    expect(priceCreditsFromEstimate(0.0001, 1.3)).toBe(1);
  });
});

describe("quoteIonqJob", () => {
  test("posts the job to qpu-proxy /jobs/estimate and prices the USD figure", async () => {
    vi.stubEnv("QUANTUM_PROXY_URL", "http://qpu-proxy.test");
    vi.stubEnv("QUANTUM_PROXY_SERVICE_KEY", "lr_test");
    vi.stubEnv("IONQ_PRICE_MARKUP", "1.3");
    const f = fakeFetch(200, { estimated_cost_usd: 2.5, backend: "qpu.forte-1", ionq: { estimated_unit: "usd" } });
    await expect(quoteIonqJob("forte-1", CIRCUIT, 100, f)).resolves.toEqual({ priceCredits: 325 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("http://qpu-proxy.test/jobs/estimate");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ circuit: CIRCUIT, shots: 100, device_instance: "forte-1" });
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer lr_test");
  });

  test("a non-USD estimate can't be priced", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = fakeFetch(200, { estimated_cost_usd: null, ionq: { estimated_unit: "credits", estimated_total_cost: 40 } });
    await expect(quoteIonqJob("forte-1", CIRCUIT, 100, f)).rejects.toMatchObject({ status: 502 });
    err.mockRestore();
  });

  test("maintenance (503), bad request (400) and outages map to clear messages", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const maintenance = quoteIonqJob("forte-1", CIRCUIT, 100, fakeFetch(503, { detail: "IonQ backend 'qpu.forte-1' is currently 'unavailable'" }));
    await expect(maintenance).rejects.toBeInstanceOf(IonqQuoteError);
    await expect(maintenance).rejects.toMatchObject({ status: 503, message: expect.stringContaining("maintenance") });

    const noRateCard = quoteIonqJob("forte-1", CIRCUIT, 100, fakeFetch(400, { detail: "IonQ has no rate card pricing 'qpu.forte-1' for this account" }));
    await expect(noRateCard).rejects.toMatchObject({ status: 400, message: expect.stringContaining("no rate card") });

    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(quoteIonqJob("forte-1", CIRCUIT, 100, down)).rejects.toMatchObject({ status: 502 });
    err.mockRestore();
  });
});
