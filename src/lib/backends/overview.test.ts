import { describe, expect, test } from "vitest";
import type { Backend } from "@/types/backend";
import { backendStats } from "./overview";

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
  card({ id: "iqm.garnet" }),
  card({ id: "iqm.garnet:mock", type: "Simulator" }),
  card({ id: "iqm.sirius", status: "unknown" }), // Checking: not online
  card({ id: "rigetti.qpu.Cepheus-1-108Q", provider: "Rigetti", status: "maintenance" }),
  card({ id: "rigetti.unmapped", provider: "Rigetti", status: "online" }), // Coming soon: not online
  card({ id: "ionq.ionq:mock", provider: "IonQ", type: "Simulator" }),
  card({ id: "ionq.forte-1", provider: "IonQ" }),
];

describe("stat cards", () => {
  test("coming soon and unknown count in totals, not in Online now", () => {
    expect(backendStats(backends)).toEqual({ total: 7, qpus: 5, simulators: 2, online: 4 });
  });

  test("empty list", () => {
    expect(backendStats([])).toEqual({ total: 0, qpus: 0, simulators: 0, online: 0 });
  });
});
