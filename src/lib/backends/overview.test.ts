import { describe, expect, test } from "vitest";
import type { Backend } from "@/types/backend";
import { backendStats, isUsagePeriod, mostUsedRows, providerSummaries, toRelativeUsage } from "./overview";

const card = (over: Partial<Backend> & Pick<Backend, "id">): Backend => ({
  name: over.id,
  type: "QPU",
  status: "online",
  qubits: 20,
  provider: "IQM",
  queueDepth: null,
  ...over,
});

const backends: Backend[] = [
  card({ id: "iqm.garnet", name: "IQM Garnet", qubits: 20 }),
  card({ id: "iqm.garnet:mock", type: "Simulator" }),
  card({ id: "iqm.sirius", status: "unknown" }), // Checking: not online
  card({ id: "rigetti.qpu.Cepheus-1-108Q", provider: "Rigetti", status: "maintenance" }),
  card({ id: "rigetti.unmapped", provider: "Rigetti", status: "online" }), // Coming soon: not online
  card({ id: "ionq.ionq:mock", name: "IonQ Simulator", provider: "IonQ", type: "Simulator", qubits: 29 }),
  card({ id: "ionq.forte-1", name: "IonQ Forte-1", provider: "IonQ", qubits: 36 }),
];

describe("stat tiles", () => {
  test("coming soon and unknown count in totals, not in Online now", () => {
    expect(backendStats(backends)).toEqual({ total: 7, qpus: 5, simulators: 2, online: 4 });
  });

  test("empty list", () => {
    expect(backendStats([])).toEqual({ total: 0, qpus: 0, simulators: 0, online: 0 });
  });
});

describe("providers strip", () => {
  test("IQM, Rigetti, IonQ in that order, with totals and online", () => {
    expect(providerSummaries(backends)).toEqual([
      { provider: "IQM", total: 3, online: 2 },
      { provider: "Rigetti", total: 2, online: 0 },
      { provider: "IonQ", total: 2, online: 2 },
    ]);
  });
});

describe("most used", () => {
  test("server side: counts become ranked shares, top = 1, zeros dropped, three decimals", () => {
    expect(
      toRelativeUsage([
        { backend: "iqm-garnet", jobs: 1 },
        { backend: "ionq-forte-1", jobs: 3 },
        { backend: "ionq-simulator", jobs: 3 },
        { backend: "iqm-sirius", jobs: 0 },
      ]),
    ).toEqual([
      { backend: "ionq-forte-1", share: 1 },
      { backend: "ionq-simulator", share: 1 },
      { backend: "iqm-garnet", share: 0.333 },
    ]);
    expect(toRelativeUsage([])).toEqual([]);
  });

  test("joins the ranking to cards, top 5, rescaled when the top backend has no card", () => {
    const rows = mostUsedRows(
      [
        { backend: "iqm-emerald", share: 1 }, // no card on the page: left out
        { backend: "ionq-forte-1", share: 0.4 },
        { backend: "ionq-simulator", share: 0.2 },
        { backend: "iqm-garnet", share: 0.1 },
        { backend: "iqm-garnet-mock", share: 0 },
      ],
      backends,
    );
    expect(rows.map((r) => [r.rank, r.backend.name, r.backend.qubits, r.share])).toEqual([
      [1, "IonQ Forte-1", 36, 1],
      [2, "IonQ Simulator", 29, 0.5],
      [3, "IQM Garnet", 20, 0.25],
    ]);
    expect(rows[0]).not.toHaveProperty("jobs");
  });

  test("limit and empty", () => {
    const many = ["iqm-garnet", "iqm-garnet-mock", "iqm-sirius", "rigetti-cepheus", "ionq-simulator", "ionq-forte-1"].map(
      (backend, i) => ({ backend, share: 1 - i * 0.1 }),
    );
    expect(mostUsedRows(many, backends)).toHaveLength(5);
    expect(mostUsedRows([], backends)).toEqual([]);
  });

  test("periods", () => {
    expect(["week", "month", "year"].every(isUsagePeriod)).toBe(true);
    expect(isUsagePeriod("day")).toBe(false);
  });
});
