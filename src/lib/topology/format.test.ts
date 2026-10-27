import { describe, expect, test } from "vitest";
import { formatMeasuredAge, formatUtcShort } from "./format";

describe("age / time formatters", () => {
  test("measured age and UTC timestamps", () => {
    expect(formatMeasuredAge(125)).toBe("measured 2m ago");
    expect(formatMeasuredAge(5 * 3600 + 59)).toBe("measured 5h ago");
    expect(formatMeasuredAge(47 * 3600)).toBe("measured 47h ago");
    expect(formatMeasuredAge(51 * 3600)).toBe("measured 2d ago");
    expect(formatMeasuredAge(null)).toBe("measured time not recorded");
    expect(formatUtcShort("2026-10-27T15:33:41+00:00")).toBe("Oct 27, 15:33 UTC");
    expect(formatUtcShort(null)).toBe("—");
  });
});
