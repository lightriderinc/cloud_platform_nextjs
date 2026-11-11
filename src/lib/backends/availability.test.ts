import { describe, expect, test } from "vitest";
import { formatQueueTime } from "./availability";

describe("formatQueueTime", () => {
  test("plain words, rounded", () => {
    expect(formatQueueTime(0)).toBe("No wait");
    expect(formatQueueTime(20_000)).toBe("Under a minute");
    expect(formatQueueTime(60_000)).toBe("About 1 minute");
    expect(formatQueueTime(1_181_215)).toBe("About 20 minutes");
    expect(formatQueueTime(3 * 3_600_000)).toBe("About 3 hours");
  });
});
