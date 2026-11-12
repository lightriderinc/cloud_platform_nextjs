import { beforeEach, describe, expect, test, vi } from "vitest";

// Offline only. fetch is stubbed and only answers the fake qpu-proxy host;
// any other URL throws, so no test here can reach qpu-proxy or IonQ. The
// per-job tests use "ionq-forte-1" because that is the per-job path under
// test; nothing is ever sent anywhere.

const PROXY = "http://qpu-proxy.test";

const state = vi.hoisted(() => ({
  balance: 0,
  unlocked: true,
  calls: [] as string[],
  ledger: [] as { amountCents: number; reason: string }[],
  jobs: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/auth/resolveCustomer", () => ({
  resolveCustomerFromRequest: async () => ({ id: "cust_1", creditsBalanceCents: state.balance }),
}));
vi.mock("@/lib/billing/planCheck", () => ({
  hasUnlockedCredits: async () => state.unlocked,
  hasEnoughCredits: (c: { creditsBalanceCents: number }, cents: number) => c.creditsBalanceCents >= cents,
}));
vi.mock("@/lib/billing/referrals", () => ({ grantReferralRewardIfEligible: async () => {} }));
vi.mock("@/lib/billing/db", () => {
  const customer = {
    updateMany: async ({ where, data }: { where: { creditsBalanceCents: { gte: number } }; data: { creditsBalanceCents: { decrement: number } } }) => {
      state.calls.push("debit");
      if (state.balance < where.creditsBalanceCents.gte) return { count: 0 };
      state.balance -= data.creditsBalanceCents.decrement;
      return { count: 1 };
    },
    update: async ({ data }: { data: { creditsBalanceCents: { increment?: number; decrement?: number } } }) => {
      const d = data.creditsBalanceCents;
      state.balance += (d.increment ?? 0) - (d.decrement ?? 0);
      state.calls.push(d.increment ? "refund" : "decrement");
      return {};
    },
  };
  const creditLedgerEntry = {
    create: async ({ data }: { data: { amountCents: number; reason: string } }) => {
      state.ledger.push({ amountCents: data.amountCents, reason: data.reason });
      return {};
    },
  };
  const quantumJobSubmission = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.jobs.push(data);
      return {};
    },
  };
  const db = {
    customer,
    creditLedgerEntry,
    quantumJobSubmission,
    $transaction: async (arg: unknown) =>
      typeof arg === "function" ? (arg as (tx: unknown) => Promise<unknown>)(db) : Promise.all(arg as Promise<unknown>[]),
  };
  return { db };
});

let estimateUsd: number | null = 1; // -> 130 credits at the default 1.3 markup
let submitStatus = 200;

beforeEach(() => {
  state.balance = 10_000;
  state.unlocked = true;
  state.calls = [];
  state.ledger = [];
  state.jobs = [];
  estimateUsd = 1;
  submitStatus = 200;
  vi.stubEnv("QUANTUM_PROXY_URL", PROXY);
  vi.stubEnv("QUANTUM_PROXY_SERVICE_KEY", "lr_test");
  vi.stubEnv("IONQ_PRICE_MARKUP", "");
  vi.stubEnv("IONQ_NOISY_SIM_PRICE_PER_SHOT_USD", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!String(url).startsWith(PROXY)) throw new Error(`test tried to reach ${url}`);
      const path = String(url).slice(PROXY.length);
      state.calls.push(`fetch ${path}`);
      if (path === "/jobs/estimate") {
        return Response.json({ estimated_cost_usd: estimateUsd });
      }
      if (path === "/jobs") {
        const body = JSON.parse(init?.body as string);
        state.calls.push(`device ${body.device_instance}`);
        if (submitStatus !== 200) return Response.json({ detail: "IonQ backend 'qpu.forte-1' is currently 'unavailable'" }, { status: submitStatus });
        return Response.json({ job_uuid: "job-123", status: "PENDING" });
      }
      throw new Error(`unexpected path ${path}`);
    }),
  );
});

async function submit(body: Record<string, unknown>) {
  const { POST } = await import("./route");
  const res = await POST(new Request("http://app.test/api/lr/quantum/submit", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
}

const CIRCUIT = { num_qubits: 1, instructions: [{ name: "h", qubits: [0] }, { name: "measure", qubits: [0], clbits: [0] }] };

describe("IonQ simulator (ionq:mock)", () => {
  test("free: no estimate, no charge, sent as device ionq:mock", async () => {
    const r = await submit({ backend: "ionq-simulator", circuit: CIRCUIT, shots: 1000 });
    expect(r.status).toBe(200);
    expect(state.calls).toEqual(["fetch /jobs", "device ionq:mock"]);
    expect(state.ledger).toEqual([]);
    expect(state.jobs[0]).toMatchObject({ backend: "ionq-simulator", costCents: 0 });
  });
});

describe("IonQ noisy simulator (forte-1:mock)", () => {
  test("free by default: no price, no charge, sent as device forte-1:mock", async () => {
    const r = await submit({ backend: "ionq-forte-1-simulator", circuit: CIRCUIT, shots: 1000 });
    expect(r.status).toBe(200);
    expect(state.calls).toEqual(["fetch /jobs", "device forte-1:mock"]);
    expect(state.ledger).toEqual([]);
    expect(state.jobs[0]).toMatchObject({ backend: "ionq-forte-1-simulator", costCents: 0 });
  });

  test("with a price set: 409 with the price first, nothing charged or sent", async () => {
    vi.stubEnv("IONQ_NOISY_SIM_PRICE_PER_SHOT_USD", "0.0003");
    const r = await submit({ backend: "ionq-forte-1-simulator", circuit: CIRCUIT, shots: 1000 });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ error: "price_confirmation_required", priceCredits: 30, balanceCredits: 10_000 });
    expect(state.calls).toEqual([]);
    expect(state.ledger).toEqual([]);
  });

  test("with a price set and confirmed: guarded debit, ledger entry, then send; no purchase needed", async () => {
    vi.stubEnv("IONQ_NOISY_SIM_PRICE_PER_SHOT_USD", "0.0003");
    state.unlocked = false; // the real-QPU gate doesn't apply to a simulator
    const r = await submit({ backend: "ionq-forte-1-simulator", circuit: CIRCUIT, shots: 1000, confirmedPriceCredits: 30 });
    expect(r.status).toBe(200);
    expect(state.calls).toEqual(["debit", "fetch /jobs", "device forte-1:mock"]);
    expect(state.balance).toBe(10_000 - 30);
    expect(state.ledger).toEqual([{ amountCents: -30, reason: "quantum_job:ionq-forte-1-simulator" }]);
    expect(state.jobs[0]).toMatchObject({ backend: "ionq-forte-1-simulator", costCents: 30 });
  });

  test("estimate route: 0 while free, the price once set", async () => {
    const { POST } = await import("../estimate/route");
    const estimate = async () =>
      (
        await POST(
          new Request("http://app.test/api/lr/quantum/estimate", {
            method: "POST",
            body: JSON.stringify({ backend: "ionq-forte-1-simulator", circuit: CIRCUIT, shots: 1000 }),
          }),
        )
      ).json();
    expect(await estimate()).toMatchObject({ priceCredits: 0 });
    vi.stubEnv("IONQ_NOISY_SIM_PRICE_PER_SHOT_USD", "0.0003");
    expect(await estimate()).toMatchObject({ priceCredits: 30 });
    expect(state.calls).toEqual([]);
  });
});

describe("IonQ Forte: priced per job, charged before the job is sent", () => {
  test("no confirmed price: 409 with the price, nothing charged or sent", async () => {
    const r = await submit({ backend: "ionq-forte-1", circuit: CIRCUIT, shots: 100 });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ error: "price_confirmation_required", priceCredits: 130 });
    expect(state.calls).toEqual(["fetch /jobs/estimate"]);
    expect(state.ledger).toEqual([]);
  });

  test("server re-quote above the confirmed price: 409 price_changed, nothing charged or sent", async () => {
    estimateUsd = 2; // 260 credits now
    const r = await submit({ backend: "ionq-forte-1", circuit: CIRCUIT, shots: 100, confirmedPriceCredits: 130 });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ error: "price_changed", priceCredits: 260 });
    expect(state.calls).not.toContain("debit");
    expect(state.calls).not.toContain("fetch /jobs");
  });

  test("balance below the price: 402, nothing sent, balance untouched", async () => {
    state.balance = 100;
    const r = await submit({ backend: "ionq-forte-1", circuit: CIRCUIT, shots: 100, confirmedPriceCredits: 130 });
    expect(r.status).toBe(402);
    expect(r.body.error).toBe("insufficient_credits");
    expect(r.body.message).toContain("130 credits");
    expect(state.balance).toBe(100);
    expect(state.calls).not.toContain("fetch /jobs");
  });

  test("canUseIonqQpu false (signup credit only): 402 purchase_required before any quote", async () => {
    state.unlocked = false;
    const r = await submit({ backend: "ionq-forte-1", circuit: CIRCUIT, shots: 100, confirmedPriceCredits: 130 });
    expect(r.status).toBe(402);
    expect(r.body.error).toBe("purchase_required");
    expect(state.calls).toEqual([]);
  });

  test("success: quote, guarded debit and ledger entry, then send; charged the server's price", async () => {
    const r = await submit({ backend: "ionq-forte-1", circuit: CIRCUIT, shots: 100, confirmedPriceCredits: 200 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ job_uuid: "job-123", priceCredits: 130 });
    expect(state.calls).toEqual(["fetch /jobs/estimate", "debit", "fetch /jobs", "device forte-1"]);
    expect(state.balance).toBe(10_000 - 130);
    expect(state.ledger).toEqual([{ amountCents: -130, reason: "quantum_job:ionq-forte-1" }]);
    expect(state.jobs[0]).toMatchObject({ jobId: "job-123", backend: "ionq-forte-1", costCents: 130, shots: 100 });
  });

  test("qpu-proxy refuses (Forte went into maintenance): refunded at once, 503 says so", async () => {
    submitStatus = 503;
    const r = await submit({ backend: "ionq-forte-1", circuit: CIRCUIT, shots: 100, confirmedPriceCredits: 130 });
    expect(r.status).toBe(503);
    expect(r.body.message).toContain("unavailable");
    expect(r.body.message).toContain("credits were returned");
    expect(state.balance).toBe(10_000);
    expect(state.ledger).toEqual([
      { amountCents: -130, reason: "quantum_job:ionq-forte-1" },
      { amountCents: 130, reason: "quantum_job_refund:ionq-forte-1" },
    ]);
    expect(state.jobs).toEqual([]);
  });
});

describe("estimate route", () => {
  test("prices a Forte job; returns only credits, never IonQ's USD or the markup", async () => {
    const { POST } = await import("../estimate/route");
    const res = await POST(
      new Request("http://app.test/api/lr/quantum/estimate", {
        method: "POST",
        body: JSON.stringify({ backend: "ionq-forte-1", circuit: CIRCUIT, shots: 100 }),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ backend: "ionq-forte-1", shots: 100, priceCredits: 130, balanceCredits: 10_000 });
    expect(state.calls).toEqual(["fetch /jobs/estimate"]);
  });

  test("refuses backends that are not priced per job", async () => {
    const { POST } = await import("../estimate/route");
    const res = await POST(
      new Request("http://app.test/api/lr/quantum/estimate", {
        method: "POST",
        body: JSON.stringify({ backend: "ionq-simulator", circuit: CIRCUIT, shots: 100 }),
      }),
    );
    expect(res.status).toBe(400);
    expect(state.calls).toEqual([]);
  });
});
