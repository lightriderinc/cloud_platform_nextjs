import { describe, expect, test } from "vitest";
import { clampedRange, qualityRgb } from "./errorGradient";

const CYAN = [0, 228, 148];
const PURPLE = [78, 0, 130];

describe("qualityRgb", () => {
  test("good end is cyan in both directions", () => {
    const r = { min: 1, max: 2 };
    expect(qualityRgb(2, r, "higher")).toEqual(CYAN); // higher is better: max -> cyan
    expect(qualityRgb(1, r, "higher")).toEqual(PURPLE);
    expect(qualityRgb(1, r, "lower")).toEqual(CYAN); // lower is better: min -> cyan
    expect(qualityRgb(2, r, "lower")).toEqual(PURPLE);
  });
});

describe("clampedRange", () => {
  test("5th–95th percentile, linear interpolation", () => {
    const v = Array.from({ length: 101 }, (_, i) => i); // 0..100
    expect(clampedRange(v)).toEqual({ min: 5, max: 95, clippedLow: true, clippedHigh: true });
    const r = clampedRange([1, 2])!; // 0.05 / 0.95 of the way between the two
    expect(r.min).toBeCloseTo(1.05, 12);
    expect(r.max).toBeCloseTo(1.95, 12);
  });

  test("single value / identical values: not clipped; empty -> null", () => {
    expect(clampedRange([3])).toEqual({ min: 3, max: 3, clippedLow: false, clippedHigh: false });
    expect(clampedRange([2, 2, 2])).toEqual({ min: 2, max: 2, clippedLow: false, clippedHigh: false });
    expect(clampedRange([])).toBeNull();
  });

  test("outliers pin to the end colors, both directions", () => {
    const vals = [...Array.from({ length: 20 }, (_, i) => 0.01 + i * 0.001), 0.39]; // one 39% readout error
    const r = clampedRange(vals)!;
    expect(r.clippedHigh).toBe(true);
    expect(r.max).toBeLessThan(0.39);
    expect(qualityRgb(0.39, r, "lower")).toEqual(PURPLE);
    expect(qualityRgb(0.0, r, "lower")).toEqual(CYAN);
    expect(qualityRgb(1e9, r, "higher")).toEqual(CYAN);
    expect(qualityRgb(-1e9, r, "higher")).toEqual(PURPLE);
  });
});
