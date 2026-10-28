import { describe, expect, test } from "vitest";
import { edge, metric, qubit } from "./__fixtures__/entries";
import type { MetricState, QubitEntry } from "./client";
import {
  colorableValue,
  couplerBand,
  CZ_ERROR_BANDS,
  DEGRADED_THRESHOLDS,
  isDegraded,
  isStaleAge,
  METRIC_STALE_AFTER_SECONDS,
  metricAgeSeconds,
  QUBIT_MAP_METRICS,
  type QubitMapMetricId,
} from "./thresholds";

const cz = (value: number | null, state: MetricState = "active", presence: MetricState = "active") =>
  edge(1, 2, metric(value, state, null, value === null ? null : 0.002), { presence });
const M = (id: QubitMapMetricId) => QUBIT_MAP_METRICS.find((m) => m.id === id)!;
const q = (overrides: Partial<QubitEntry> = {}) => qubit(1, overrides);

describe("couplerBand", () => {
  test("green < 1%, amber 1–2% inclusive, red > 2%", () => {
    expect(couplerBand(cz(0.995))).toBe("good");
    expect(couplerBand(cz(0.99001))).toBe("good");
    expect(couplerBand(cz(0.99))).toBe("warn"); // exactly 1% error
    expect(couplerBand(cz(0.985))).toBe("warn");
    expect(couplerBand(cz(0.98))).toBe("warn"); // exactly 2% (1 - 0.98 = 0.020000000000000018 in fp)
    expect(couplerBand(cz(0.97999))).toBe("bad");
    expect(couplerBand(cz(0.5))).toBe("bad"); // a genuine 0.5 in an ACTIVE state is a value, not a sentinel
  });

  test("sentinel / absent / null never land on the scale", () => {
    expect(couplerBand(cz(null, "sentinel"))).toBe("uncalibrated");
    expect(couplerBand(cz(0.995, "sentinel"))).toBe("uncalibrated"); // state wins even if a value leaked through
    expect(couplerBand(cz(0.995, "active", "absent"))).toBe("uncalibrated");
    expect(couplerBand(cz(null, "active"))).toBe("uncalibrated");
  });

  test("degraded with a value is banded by value", () => {
    expect(couplerBand(cz(0.97, "degraded"))).toBe("bad");
  });

  test("bands are the one config", () => {
    expect(CZ_ERROR_BANDS).toEqual({ goodBelow: 0.01, warnUpTo: 0.02 });
  });
});

describe("qubit map metrics", () => {
  test("four metrics in order, T2 labelled T2*; ring labels for the legend", () => {
    expect(QUBIT_MAP_METRICS.map((m) => m.label)).toEqual(["1Q fidelity", "Readout error", "T1", "T2*"]);
    expect(QUBIT_MAP_METRICS.map((m) => m.threshold?.label ?? null)).toEqual(["Below 99.5%", "Over 10%", null, null]);
  });

  test("direction: only readout error is lower-is-better", () => {
    for (const m of QUBIT_MAP_METRICS) expect(m.better).toBe(m.id === "readoutError" ? "lower" : "higher");
  });

  test("readout error is 1 - fRO", () => {
    expect(colorableValue(q({ readout: metric(0.95) }), M("readoutError"))).toBeCloseTo(0.05, 12);
  });

  test("thresholds come from LR-TECH-001 §3; none for T1/T2*", () => {
    expect(DEGRADED_THRESHOLDS).toEqual({
      singleQubitFidelity: 0.995,
      czFidelity: 0.98,
      readoutFidelity: 0.9,
      t1Seconds: null,
      t2StarSeconds: null,
    });
    expect(M("t1").threshold).toBeNull();
    expect(M("t2Star").threshold).toBeNull();
  });

  test("below-threshold flag, at and around the line", () => {
    expect(isDegraded(q({ frbSimultaneous: metric(0.9949) }), M("frbSimultaneous"))).toBe(true);
    expect(isDegraded(q({ frbSimultaneous: metric(0.995) }), M("frbSimultaneous"))).toBe(false); // §3: "at or above" is ACTIVE
    expect(isDegraded(q({ readout: metric(0.899) }), M("readoutError"))).toBe(true);
    expect(isDegraded(q({ readout: metric(0.9) }), M("readoutError"))).toBe(false);
    expect(isDegraded(q({ t1: metric(1e-9) }), M("t1"))).toBe(false); // no threshold -> never flagged
  });

  test("sentinel / absent: never colored, never flagged, never a number", () => {
    const sentinel = q({ frbSimultaneous: metric(null, "sentinel") });
    expect(colorableValue(sentinel, M("frbSimultaneous"))).toBeNull();
    expect(isDegraded(sentinel, M("frbSimultaneous"))).toBe(false);
    const absent = q({ presence: "absent", frbSimultaneous: metric(null, "absent") });
    expect(colorableValue(absent, M("frbSimultaneous"))).toBeNull();
    expect(isDegraded(absent, M("frbSimultaneous"))).toBe(false);
    // a sentinel whose 0.5 placeholder leaked into value is still not colorable
    expect(colorableValue(q({ readout: metric(0.5, "sentinel") }), M("readoutError"))).toBeNull();
  });

  test("upstream DEGRADED state is flagged even without a threshold", () => {
    expect(isDegraded(q({ t2: metric(5e-6, "degraded") }), M("t2Star"))).toBe(true);
    expect(colorableValue(q({ t2: metric(5e-6, "degraded") }), M("t2Star"))).toBe(5e-6);
  });
});

describe("measurement age", () => {
  const ref = { sourceTimestamp: "2026-10-27T15:00:00+00:00", snapshotAgeSeconds: 3 * 3600 };

  test("anchored on the server's snapshot age, not the browser clock", () => {
    expect(metricAgeSeconds("2026-10-27T15:00:00+00:00", ref)).toBe(3 * 3600); // measured at the source time
    expect(metricAgeSeconds("2026-10-27T13:00:00Z", ref)).toBe(5 * 3600); // 2h before it
    expect(metricAgeSeconds("2026-10-25T15:00:00+00:00", ref)).toBe(51 * 3600);
  });

  test("missing / unparseable -> null, never 0", () => {
    expect(metricAgeSeconds(null, ref)).toBeNull();
    expect(metricAgeSeconds("garbage", ref)).toBeNull();
    expect(metricAgeSeconds("2026-10-27T15:00:00Z", null)).toBeNull();
    expect(metricAgeSeconds("2026-10-27T15:00:00Z", { sourceTimestamp: null, snapshotAgeSeconds: 10 })).toBeNull();
    expect(metricAgeSeconds("2026-10-27T15:00:00Z", { sourceTimestamp: ref.sourceTimestamp, snapshotAgeSeconds: null })).toBeNull();
  });

  test("stale limit is rigetti-proxy's 36h, exclusive", () => {
    expect(METRIC_STALE_AFTER_SECONDS).toBe(36 * 3600);
    expect(isStaleAge(36 * 3600)).toBe(false);
    expect(isStaleAge(36 * 3600 + 1)).toBe(true);
    expect(isStaleAge(null)).toBe(false);
  });
});
