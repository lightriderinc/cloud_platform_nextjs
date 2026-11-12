import { describe, expect, test } from "vitest";
import {
  formatCapabilityList,
  formatErrorPercent,
  formatIonqStatus,
  formatMicroseconds,
  formatSeconds,
  formatTopology,
  ionqDetailsFilename,
  ionqDeviceFromCatalogId,
  isIonqDetailDevice,
  parseCharacterizationDate,
} from "./details";

const allPairs = (n: number) => {
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  return pairs;
};

describe("devices", () => {
  test("only the four IonQ devices", () => {
    for (const d of ["ionq:mock", "forte-1:mock", "forte-1", "forte-enterprise-1"]) expect(isIonqDetailDevice(d)).toBe(true);
    for (const d of [null, "", "garnet", "forte-1/../jobs", "FORTE-1"]) expect(isIonqDetailDevice(d)).toBe(false);
  });

  test("catalog id to device", () => {
    expect(ionqDeviceFromCatalogId("ionq.forte-1:mock")).toBe("forte-1:mock");
    expect(ionqDeviceFromCatalogId("ionq.forte-enterprise-1")).toBe("forte-enterprise-1");
    expect(ionqDeviceFromCatalogId("iqm.garnet")).toBeNull();
    expect(ionqDeviceFromCatalogId("ionq.unknown")).toBeNull();
  });
});

describe("topology", () => {
  test("every pair present is all-to-all, in either order and with duplicates", () => {
    expect(formatTopology(allPairs(36), 36)).toBe("all-to-all");
    const reversed = allPairs(4).map(([a, b]) => [b, a] as [number, number]);
    expect(formatTopology([...reversed, [0, 1]], 4)).toBe("all-to-all");
  });

  test("a missing pair is a count, never the list", () => {
    expect(formatTopology(allPairs(36).slice(1), 36)).toBe("629 connections");
    expect(formatTopology([[0, 1]], 3)).toBe("1 connection");
  });

  test("no topology hides the row", () => {
    expect(formatTopology(null, 36)).toBeNull();
    expect(formatTopology([], 36)).toBeNull();
  });
});

describe("units", () => {
  test("errors as percentages with three decimals", () => {
    expect(formatErrorPercent(0.0001)).toBe("0.010%");
    expect(formatErrorPercent(0.0041)).toBe("0.410%");
    expect(formatErrorPercent(0.0049)).toBe("0.490%");
    expect(formatErrorPercent(null)).toBeNull();
  });

  test("T1 and T2 in seconds", () => {
    expect(formatSeconds(100)).toBe("100 s");
    expect(formatSeconds(1)).toBe("1 s");
    expect(formatSeconds(0.95)).toBe("0.95 s");
    expect(formatSeconds(undefined)).toBeNull();
  });

  test("gate, readout and reset times in microseconds", () => {
    expect(formatMicroseconds(0.00013)).toBe("130 µs");
    expect(formatMicroseconds(0.00097)).toBe("970 µs");
    expect(formatMicroseconds(0.000063)).toBe("63 µs");
    expect(formatMicroseconds(0.00002)).toBe("20 µs");
    expect(formatMicroseconds(null)).toBeNull();
  });
});

describe("characterization date", () => {
  test("ISO, epoch seconds and epoch ms", () => {
    const iso = "2026-11-11T08:30:00Z";
    expect(parseCharacterizationDate(iso)?.toISOString()).toBe("2026-11-11T08:30:00.000Z");
    const secs = Date.parse(iso) / 1000;
    expect(parseCharacterizationDate(secs)?.toISOString()).toBe("2026-11-11T08:30:00.000Z");
    expect(parseCharacterizationDate(secs * 1000)?.toISOString()).toBe("2026-11-11T08:30:00.000Z");
    expect(parseCharacterizationDate(String(secs))?.toISOString()).toBe("2026-11-11T08:30:00.000Z");
  });

  test("missing or junk hides the line", () => {
    expect(parseCharacterizationDate(null)).toBeNull();
    expect(parseCharacterizationDate("")).toBeNull();
    expect(parseCharacterizationDate("not a date")).toBeNull();
  });
});

describe("capabilities, status, filename", () => {
  test("an empty list hides the row", () => {
    expect(formatCapabilityList(["x", "y", "cx"])).toBe("x, y, cx");
    expect(formatCapabilityList([])).toBeNull();
    expect(formatCapabilityList(null)).toBeNull();
    expect(formatCapabilityList([{ name: "debiasing" }])).toBe('{"name":"debiasing"}');
  });

  test("status in plain words", () => {
    expect(formatIonqStatus("available", false)).toBe("Available");
    expect(formatIonqStatus("available", true)).toBe("Degraded");
    expect(formatIonqStatus("unavailable", false)).toBe("Unavailable");
    expect(formatIonqStatus(null, false)).toBeNull();
  });

  test("download filename has no colon", () => {
    expect(ionqDetailsFilename("ionq:mock")).toBe("ionq-ionq-mock-details.json");
    expect(ionqDetailsFilename("forte-1")).toBe("ionq-forte-1-details.json");
  });
});
