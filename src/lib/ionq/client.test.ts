import { describe, expect, test } from "vitest";
import { getQuantumBackendId, isPaidBackend, isPricedPerJob } from "@/lib/quantum/backends";
import { mapIonqBackends, type IonqStatusResponse } from "./client";

// IonQ's GET /backends as qpu-proxy /healthz passes it on (backends.ionq).
const listing = (over: IonqStatusResponse["backends"] = {}): IonqStatusResponse => ({
  ok: true,
  backends: {
    simulator: { status: "available", degraded: false, qubits: 29, average_queue_time: 0 },
    "qpu.forte-1": { status: "available", degraded: false, qubits: 36, average_queue_time: 1_181_215 },
    "qpu.forte-enterprise-1": { status: "available", degraded: false, qubits: 36, average_queue_time: 30_000 },
    ...over,
  },
});
const byId = (response: IonqStatusResponse | null) => Object.fromEntries(mapIonqBackends(response).map((b) => [b.id, b]));

describe("IonQ catalog cards", () => {
  test("four devices, trapped-ion all-to-all, no chiplet or qubit map", () => {
    const cards = mapIonqBackends(listing());
    expect(cards.map((b) => [b.id, b.type, b.qubits])).toEqual([
      ["ionq.ionq:mock", "Simulator", 29],
      ["ionq.forte-1:mock", "Simulator", 29],
      ["ionq.forte-1", "QPU", 36],
      ["ionq.forte-enterprise-1", "QPU", 36],
    ]);
    for (const b of cards) {
      expect(b.provider).toBe("IonQ");
      expect(b.details?.topology).toBe("All-to-all connectivity");
      expect(b.details?.qubitMap).toBeUndefined();
    }
  });

  test("every card maps to a submittable backend; only the Forte QPUs are paid, and they are priced per job", () => {
    const ids = mapIonqBackends(listing()).map((b) => getQuantumBackendId(b.id));
    expect(ids).toEqual(["ionq-simulator", "ionq-forte-1-simulator", "ionq-forte-1", "ionq-forte-enterprise-1"]);
    expect(ids.map((id) => isPaidBackend(id!))).toEqual([false, false, true, true]);
    expect(ids.map((id) => isPricedPerJob(id!))).toEqual([false, false, true, true]);
  });

  test("live status: Forte in maintenance shows Unavailable and not available now", () => {
    const c = byId(listing({ "qpu.forte-1": { status: "unavailable", degraded: false, qubits: 36, average_queue_time: 0 } }));
    expect(c["ionq.forte-1"].status).toBe("maintenance");
    expect(c["ionq.forte-1"].statusInfo?.label).toBe("Unavailable");
    expect(c["ionq.forte-1"].availability?.availableNow).toBe(false);
    // the other devices keep their own status
    expect(c["ionq.forte-enterprise-1"].status).toBe("online");
    expect(c["ionq.ionq:mock"].status).toBe("online");
  });

  test("degraded and retired", () => {
    const c = byId(
      listing({
        "qpu.forte-1": { status: "available", degraded: true, qubits: 36, average_queue_time: 0 },
        "qpu.forte-enterprise-1": { status: "retired", degraded: false, qubits: 36, average_queue_time: 0 },
      }),
    );
    expect(c["ionq.forte-1"].status).toBe("online");
    expect(c["ionq.forte-1"].statusInfo?.label).toBe("Degraded");
    expect(c["ionq.forte-enterprise-1"].status).toBe("offline");
    expect(c["ionq.forte-enterprise-1"].statusInfo?.label).toBe("Retired");
  });

  test("both simulators follow IonQ's single 'simulator' entry", () => {
    const c = byId(listing({ simulator: { status: "unavailable", degraded: false, qubits: 29, average_queue_time: 0 } }));
    expect(c["ionq.ionq:mock"].status).toBe("maintenance");
    expect(c["ionq.forte-1:mock"].status).toBe("maintenance");
  });

  test("queue time comes through in ms", () => {
    const c = byId(listing());
    expect(c["ionq.forte-1"].queueTimeMs).toBe(1_181_215);
    expect(c["ionq.ionq:mock"].queueTimeMs).toBe(0);
  });

  test("no status (fetch failed, IonQ unreachable, or device missing) never shows Online, and never drops a card", () => {
    for (const response of [null, { ok: false, error: "IonQ unreachable" }, { ok: true, backends: {} }]) {
      const cards = mapIonqBackends(response);
      expect(cards).toHaveLength(4);
      for (const b of cards) {
        expect(b.status).toBe("unknown");
        expect(b.availability?.availableNow).toBe(false);
        expect(b.queueTimeMs).toBeNull();
      }
    }
  });
});
