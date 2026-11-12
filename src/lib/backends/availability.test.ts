import { describe, expect, test } from "vitest";
import { formatQueueTime } from "./availability";

describe("formatQueueTime", () => {
  test("hours and minutes, like IonQ Cloud", () => {
    expect(formatQueueTime(0)).toBe("0 min");
    expect(formatQueueTime(20_000)).toBe("0 min");
    expect(formatQueueTime(60_000)).toBe("1 min");
    expect(formatQueueTime(1_181_215)).toBe("20 min");
    expect(formatQueueTime(60 * 60_000)).toBe("1 hr");
    expect(formatQueueTime(65 * 60_000)).toBe("1 hr 5 min");
    expect(formatQueueTime(3 * 3_600_000)).toBe("3 hrs");
    expect(formatQueueTime((16 * 60 + 59) * 60_000 + 10_000)).toBe("16 hrs 59 min");
  });

  test("bad input reads as no wait rather than NaN", () => {
    expect(formatQueueTime(-5)).toBe("0 min");
    expect(formatQueueTime(Number.NaN)).toBe("0 min");
  });
});
