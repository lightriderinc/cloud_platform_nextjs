import { beforeEach, describe, expect, test, vi } from "vitest";

// Offline: the db is mocked; the test only checks the query shape and output.
const state = vi.hoisted(() => ({
  rows: [] as { backend: string; _count: { _all: number } }[],
  lastWhere: null as null | { createdAt: { gte: Date } },
  fail: false,
}));

vi.mock("@/lib/billing/db", () => ({
  db: {
    quantumJobSubmission: {
      groupBy: async ({ where }: { where: { createdAt: { gte: Date } } }) => {
        state.lastWhere = where;
        if (state.fail) throw new Error("db down");
        return state.rows;
      },
    },
  },
}));

import { GET } from "./route";

const get = (query: string) => GET(new Request(`http://app.test/api/backends/most-used${query}`));
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  state.rows = [
    { backend: "iqm-garnet", _count: { _all: 3 } },
    { backend: "ionq-simulator", _count: { _all: 12 } },
    { backend: "old-removed-backend", _count: { _all: 50 } },
  ];
  state.lastWhere = null;
  state.fail = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/backends/most-used", () => {
  test("known backends ranked with relative bar sizes; no job counts leave the server", async () => {
    const res = await get("?period=week");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      period: "week",
      usage: [
        { backend: "ionq-simulator", share: 1 },
        { backend: "iqm-garnet", share: 0.25 },
      ],
    });
    expect(JSON.stringify(body)).not.toMatch(/jobs|count|12/);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
  });

  test("window: 7, 30 or 365 days back; week by default", async () => {
    for (const [query, days] of [["", 7], ["?period=month", 30], ["?period=year", 365]] as const) {
      const before = Date.now();
      await get(query);
      const since = state.lastWhere!.createdAt.gte.getTime();
      expect(Math.round((before - since) / DAY)).toBe(days);
    }
  });

  test("bad period: 400; query failure: 502", async () => {
    expect((await get("?period=day")).status).toBe(400);
    state.fail = true;
    expect((await get("?period=week")).status).toBe(502);
  });
});
