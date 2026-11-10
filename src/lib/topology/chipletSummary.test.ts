import { describe, expect, test } from "vitest";
import { edge, metric, qubit } from "./__fixtures__/entries";
import {
  loadSynthetic,
  SOURCE_TIMESTAMP,
  wireEdges,
  wireQubits,
  type WireEdge,
  type WireQubit,
} from "./__fixtures__/syntheticSnapshot";
import { summarizeChiplets } from "./chipletSummary";

// Independent restatement over the raw WIRE rows (not the normalized
// entries the helper sees): measured = active state with a value.
function expected(cid: string) {
  const qs = wireQubits().data.qubits.filter((q: WireQubit) => q.chiplet_id === cid);
  const idx = new Set(qs.map((q) => q.qubit_index));
  const es = wireEdges().data.edges;
  const intra = es.filter((e: WireEdge) => idx.has(e.node_a) && idx.has(e.node_b));
  const boundary = es.filter((e: WireEdge) => idx.has(e.node_a) !== idx.has(e.node_b));
  const calibrated = (l: WireEdge[]) => l.filter((e) => e.cz_state === "active" && e.cz_fidelity !== null).length;
  const worst = (l: WireEdge[]) =>
    l
      .filter((e) => e.cz_state === "active")
      .reduce<WireEdge | null>((a, e) => (!a || (e.cz_fidelity as number) < (a.cz_fidelity as number) ? e : a), null);
  const lowest = (value: (q: WireQubit) => number | null, state: (q: WireQubit) => string) =>
    qs
      .filter((q) => q.presence !== "absent" && state(q) === "active" && value(q) !== null)
      .reduce<WireQubit | null>((a, q) => (!a || (value(q) as number) < (value(a) as number) ? q : a), null);
  const frb = qs.filter((q) => q.presence !== "absent" && q.frb_simultaneous_state === "active");
  const key = (e: WireEdge | null) => (e ? `${e.node_a}-${e.node_b}` : null);
  return {
    intra: { total: intra.length, calibrated: calibrated(intra) },
    boundary: { total: boundary.length, calibrated: calibrated(boundary) },
    worstCoupler: key(worst(intra)),
    worstBoundary: key(worst(boundary)),
    worstReadout: lowest((q) => q.readout_fidelity, (q) => q.readout_state)?.qubit_index ?? null,
    lowestT1: lowest((q) => q.t1_seconds, (q) => q.t1_state)?.qubit_index ?? null,
    lowestT2: lowest((q) => q.t2_seconds, (q) => q.t2_state)?.qubit_index ?? null,
    frbMean: frb.length ? frb.reduce((a, q) => a + (q.frb_simultaneous as number), 0) / frb.length : null,
    frbMeasured: frb.length,
    frbSentinel: qs.filter((q) => q.frb_simultaneous_state === "sentinel").length,
  };
}

const keyOf = (w: { edge: { nodeA: number; nodeB: number } } | null) => (w ? `${w.edge.nodeA}-${w.edge.nodeB}` : null);

describe("summarizeChiplets — synthetic snapshot", () => {
  test("every chiplet matches an independent computation", async () => {
    const { qubits, edges } = await loadSynthetic();
    const sums = summarizeChiplets(qubits, edges);
    expect([...sums.keys()].sort()).toEqual(["C1", "C2", "C3"]);
    for (const [cid, s] of sums) {
      const x = expected(cid);
      expect(s.intraCouplers, cid).toEqual(x.intra);
      expect(s.boundaryCouplers, cid).toEqual(x.boundary);
      expect(keyOf(s.worstCoupler), cid).toBe(x.worstCoupler);
      expect(keyOf(s.worstBoundaryCoupler), cid).toBe(x.worstBoundary);
      if (s.worstCoupler) expect(s.worstCoupler.edge.isInterChiplet, cid).toBe(false);
      expect(s.worstReadout?.qubitIndex ?? null, cid).toBe(x.worstReadout);
      expect(s.lowestT1?.qubitIndex ?? null, cid).toBe(x.lowestT1);
      expect(s.lowestT2Star?.qubitIndex ?? null, cid).toBe(x.lowestT2);
      expect(s.frbSimultaneous.measuredCount, cid).toBe(x.frbMeasured);
      expect(s.frbSimultaneous.sentinelCount, cid).toBe(x.frbSentinel);
      if (x.frbMean === null) expect(s.frbSimultaneous.mean, cid).toBeNull();
      else expect(s.frbSimultaneous.mean, cid).toBeCloseTo(x.frbMean, 12);
    }
  });

  test("the fixture's deliberate cases", async () => {
    const { qubits, edges } = await loadSynthetic();
    const s = summarizeChiplets(qubits, edges);
    const [c1, c2, c3] = ["C1", "C2", "C3"].map((c) => s.get(c)!);
    // C1: intra sentinel 0-1; its boundary's worst is 2-3 (C1-C2)
    expect(c1.intraCouplers).toEqual({ total: 12, calibrated: 11 });
    expect(keyOf(c1.worstBoundaryCoupler)).toBe("2-3");
    // C2: no intra sentinels, but the C2-C3 boundary coupler 14-15 is; worst intra is 3-4,
    // and the far worse boundary 2-3 does not become C2's "worst"
    expect(c2.intraCouplers).toEqual({ total: 12, calibrated: 12 });
    expect(c2.boundaryCouplers).toEqual({ total: 6, calibrated: 5 });
    expect(keyOf(c2.worstCoupler)).toBe("3-4");
    expect(c2.worstCoupler!.czError).toBeCloseTo(0.025, 12);
    expect(keyOf(c2.worstBoundaryCoupler)).toBe("2-3");
    expect(c2.frbSimultaneous).toMatchObject({ measuredCount: 7, sentinelCount: 2 });
    // C3: q8 absent so its two couplers aren't in the ISA; 24-25 sentinel;
    // worst readout is q25, and the readout-sentinel q16 is never a candidate
    expect(c3.absentQubits).toEqual([8]);
    expect(c3.intraCouplers).toEqual({ total: 10, calibrated: 9 });
    expect(c3.worstReadout).toMatchObject({ qubitIndex: 25, value: 0.85 });
    // Data age: q10's stale T1 is the oldest, q0's fRB the newest (= source time)
    expect(c1.oldestMeasuredAt).toBe("2026-10-25T12:00:00+00:00");
    expect(c1.newestMeasuredAt).toBe(SOURCE_TIMESTAMP);
    // A snapshot stored before per-metric timestamps: no age, not a fake one.
    const untimed = await loadSynthetic({ withTimes: false });
    expect(summarizeChiplets(untimed.qubits, untimed.edges).get("C1")!.oldestMeasuredAt).toBeNull();
  });
});

describe("summarizeChiplets — sentinel / edge cases", () => {
  test("sentinels never count: not in means, not minimums, not 'worst'", () => {
    const qubits = [
      qubit(0, { readout: metric(null, "sentinel"), t1: metric(null, "sentinel"), frbSimultaneous: metric(null, "sentinel") }),
      qubit(1, { readout: metric(0.9), t1: metric(20e-6), frbSimultaneous: metric(0.99) }),
      qubit(2, { readout: metric(0.97), t1: metric(40e-6), frbSimultaneous: metric(0.995) }),
      qubit(3, { presence: "absent", readout: metric(null, "absent"), t1: metric(null, "absent"), frbSimultaneous: metric(null, "absent") }),
    ];
    const edges = [edge(0, 1, metric(null, "sentinel")), edge(1, 2, metric(0.97)), edge(2, 3, metric(0.99))];
    const s = summarizeChiplets(qubits, edges).get("C1")!;
    expect(s.worstReadout).toMatchObject({ qubitIndex: 1, value: 0.9 });
    expect(s.worstReadout!.qubit.qubitIndex).toBe(1);
    expect(s.lowestT1).toMatchObject({ qubitIndex: 1, value: 20e-6 });
    expect(s.frbSimultaneous.mean).toBeCloseTo(0.9925, 12);
    expect(s.frbSimultaneous.measuredCount).toBe(2);
    expect(s.frbSimultaneous.sentinelCount).toBe(1); // absent is not counted as sentinel
    expect(s.intraCouplers).toEqual({ total: 3, calibrated: 2 });
    expect(keyOf(s.worstCoupler)).toBe("1-2");
    expect(s.absentQubits).toEqual([3]);
  });

  test("all-unmeasured chiplet: nulls, never 0", () => {
    const all = (state: "sentinel") => ({ readout: metric(null, state), t1: metric(null, state), t2: metric(null, state), frbSimultaneous: metric(null, state) });
    const s = summarizeChiplets([qubit(0, all("sentinel"))], [edge(0, 1, metric(null, "sentinel"))]).get("C1")!;
    expect(s.worstReadout).toBeNull();
    expect(s.lowestT1).toBeNull();
    expect(s.lowestT2Star).toBeNull();
    expect(s.frbSimultaneous.mean).toBeNull();
    expect(s.worstCoupler).toBeNull();
    expect(s.worstBoundaryCoupler).toBeNull();
    expect(s.boundaryCouplers).toEqual({ total: 1, calibrated: 0 }); // q1 isn't in C1 -> boundary
  });

  test("data age span ignores sentinel timestamps", () => {
    const qubits = [
      qubit(0, { t1: metric(30e-6, "active", "2026-10-25T10:00:00Z"), t2: metric(null, "sentinel", "2026-10-01T00:00:00Z") }),
      qubit(1, { readout: metric(0.95, "active", "2026-10-27T09:00:00Z") }),
    ];
    const s = summarizeChiplets(qubits, [edge(0, 1, metric(0.99, "active", "2026-10-26T00:00:00Z"))]).get("C1")!;
    expect(s.oldestMeasuredAt).toBe("2026-10-25T10:00:00Z");
    expect(s.newestMeasuredAt).toBe("2026-10-27T09:00:00Z");
  });

  test("a worse boundary coupler never becomes the chiplet's worst", () => {
    const qubits = [qubit(0), qubit(1), qubit(2, { chipletId: "C2" })];
    const edges = [edge(0, 1, metric(0.995)), edge(1, 2, metric(0.9))]; // 1-2 crosses into C2 and is far worse
    const s = summarizeChiplets(qubits, edges).get("C1")!;
    expect(keyOf(s.worstCoupler)).toBe("0-1");
    expect(keyOf(s.worstBoundaryCoupler)).toBe("1-2");
  });

  test("qubits without a chipletId are skipped; edges-free call works (picker case)", () => {
    const s = summarizeChiplets([qubit(0), qubit(1, { chipletId: null })], []);
    expect([...s.keys()]).toEqual(["C1"]);
    expect(s.get("C1")!.qubitCount).toBe(1);
    expect(s.get("C1")!.intraCouplers).toEqual({ total: 0, calibrated: 0 });
  });
});
