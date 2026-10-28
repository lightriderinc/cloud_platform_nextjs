import { describe, expect, test } from "vitest";
import { metric } from "./__fixtures__/entries";
import {
  formatAgo,
  formatDuration,
  formatDurationNs,
  formatHours,
  formatMeasuredAge,
  formatMetricValue,
  formatNextCheck,
  formatPct,
  formatPctErrorBar,
  formatSeconds,
  formatSecondsErrorBar,
  stateLabel,
} from "./format";

describe("user-facing formatting", () => {
  test("measured age reads as plain words, with plurals", () => {
    expect(formatMeasuredAge(125)).toBe("Measured 2 minutes ago");
    expect(formatMeasuredAge(3600)).toBe("Measured 1 hour ago");
    expect(formatMeasuredAge(5 * 3600 + 59)).toBe("Measured 5 hours ago");
    expect(formatMeasuredAge(47 * 3600)).toBe("Measured 47 hours ago");
    expect(formatMeasuredAge(51 * 3600)).toBe("Measured 2 days ago");
    expect(formatMeasuredAge(null)).toBe("Measurement time not recorded");
    expect(formatDuration(86400 * 3)).toBe("3 days");
    expect(formatHours(36 * 3600)).toBe("36 hours");
  });

  test("anything unmeasured reads Not measured, never 0 or a placeholder", () => {
    expect(formatPct(null)).toBe("Not measured");
    expect(formatSeconds(null)).toBe("Not measured");
    expect(formatMetricValue(metric(0.5, "sentinel"), formatPct)).toBe("Not measured");
    expect(formatMetricValue(metric(null, "absent"), formatPct)).toBe("Absent");
  });

  test("precision: percentages 2 decimals, T1/T2* 1 decimal in µs, gate times in whole ns", () => {
    expect(formatPct(0.997812)).toBe("99.78%");
    expect(formatPct(0.0074)).toBe("0.74%");
    expect(formatPctErrorBar(0.0003)).toBe("± 0.03%");
    expect(formatPctErrorBar(0.00002)).toBe("± <0.01%");
    expect(formatSeconds(26.16e-6)).toBe("26.2 µs");
    expect(formatSeconds(0.2e-6)).toBe("0.2 µs");
    expect(formatSecondsErrorBar(3.7e-6)).toBe("± 3.7 µs");
    expect(formatSecondsErrorBar(0.02e-6)).toBe("± <0.1 µs");
    expect(formatDurationNs(200)).toBe("200 ns");
  });

  test("status wording", () => {
    expect(stateLabel("active")).toBe("Measured");
    expect(stateLabel("sentinel")).toBe("Not measured");
    expect(stateLabel("degraded")).toBe("Below threshold");
    expect(stateLabel("absent")).toBe("Absent");
    expect(formatAgo(3600)).toBe("1 hour ago");
    expect(formatAgo(57 * 60)).toBe("57 minutes ago");
    expect(formatNextCheck(3 * 3600 + 28 * 60)).toBe("Next check in 3 hours");
    expect(formatNextCheck(54 * 60)).toBe("Next check in 54 minutes");
  });

  test("no en or em dashes in any formatted output", () => {
    const outputs = [
      formatMeasuredAge(125),
      formatMeasuredAge(null),
      formatPct(null),
      formatPctErrorBar(0.0003),
      formatNextCheck(3600),
      ...(["active", "degraded", "sentinel", "absent"] as const).map(stateLabel),
    ];
    for (const s of outputs) expect(s).not.toMatch(/[–—]/);
  });
});
