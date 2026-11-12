import { describe, expect, test, vi } from "vitest";

const unlocked = vi.hoisted(() => ({ value: true, askedFor: [] as string[] }));
vi.mock("@/lib/billing/planCheck", () => ({
  hasUnlockedCredits: async (customerId: string) => {
    unlocked.askedFor.push(customerId);
    return unlocked.value;
  },
}));

import { canUseIonqQpu } from "./ionqAccess";

describe("canUseIonqQpu", () => {
  test("today: the existing real-QPU rule (unlocked credits)", async () => {
    unlocked.value = true;
    await expect(canUseIonqQpu("cust_1")).resolves.toBe(true);
    unlocked.value = false;
    await expect(canUseIonqQpu("cust_2")).resolves.toBe(false);
    expect(unlocked.askedFor).toEqual(["cust_1", "cust_2"]);
  });
});
