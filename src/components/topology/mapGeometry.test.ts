import { describe, expect, test } from "vitest";
import { couplerSegment, gapBand, type Rect } from "./mapGeometry";

const R = (left: number, top: number, width: number, height: number): Rect => ({ left, top, width, height });

describe("couplerSegment", () => {
  test("intra segment spans exactly the gap between two cells", () => {
    const a = R(0, 0, 30, 30), b = R(40, 0, 30, 30);
    expect(couplerSegment(a, b, a, b)).toEqual({ x1: 30, y1: 15, x2: 40, y2: 15 });
    const c = R(0, 40, 30, 30);
    expect(couplerSegment(a, c, a, c)).toEqual({ x1: 15, y1: 30, x2: 15, y2: 40 });
  });

  test("inter segment clips at the boxes, aligned with the qubit centers", () => {
    const cellA = R(60, 20, 30, 30), cellB = R(116, 20, 30, 30);
    const boxA = R(0, 0, 96, 110), boxB = R(112, 0, 96, 110);
    expect(couplerSegment(cellA, cellB, boxA, boxB)).toEqual({ x1: 96, y1: 35, x2: 112, y2: 35 });
  });

  test("touching/overlapping clips -> no segment", () => {
    const a = R(0, 0, 30, 30), b = R(30, 0, 30, 30);
    expect(couplerSegment(a, b, a, b)).toBeNull();
    expect(couplerSegment(a, a, a, a)).toBeNull();
  });
});

describe("gapBand", () => {
  test("horizontal and vertical, either argument order", () => {
    const a = R(0, 0, 100, 120), b = R(116, 0, 100, 120), c = R(0, 136, 100, 120);
    expect(gapBand(a, b)).toEqual(R(100, 0, 16, 120));
    expect(gapBand(b, a)).toEqual(R(100, 0, 16, 120));
    expect(gapBand(a, c)).toEqual(R(0, 120, 100, 16));
    expect(gapBand(a, R(50, 50, 100, 100))).toBeNull(); // overlapping
    expect(gapBand(a, R(116, 200, 100, 100))).toBeNull(); // diagonal: no shared span
  });
});
