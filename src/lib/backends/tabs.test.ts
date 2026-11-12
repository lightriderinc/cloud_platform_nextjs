import { describe, expect, test } from "vitest";
import { mapIonqBackends } from "@/lib/ionq/client";
import { backendTab, countByTab, isBackendTab } from "./tabs";

describe("backend tabs", () => {
  test("split by type, not by tag label", () => {
    const ionq = mapIonqBackends(null);
    expect(ionq.map((b) => [b.id, b.tagLabel, backendTab(b)])).toEqual([
      ["ionq.ionq:mock", "Simulator", "simulators"],
      ["ionq.forte-1:mock", "Cloud", "simulators"],
      ["ionq.forte-1", "Cloud", "qpus"],
      ["ionq.forte-enterprise-1", "Cloud", "qpus"],
    ]);
    expect(countByTab(ionq)).toEqual({ qpus: 2, simulators: 2 });
  });

  test("counts with nothing in a tab", () => {
    expect(countByTab([{ type: "QPU" }, { type: "QPU" }])).toEqual({ qpus: 2, simulators: 0 });
    expect(countByTab([])).toEqual({ qpus: 0, simulators: 0 });
  });

  test("only known tab values from the URL", () => {
    expect(isBackendTab("simulators")).toBe(true);
    expect(isBackendTab("qpus")).toBe(true);
    expect(isBackendTab("Simulators")).toBe(false);
    expect(isBackendTab(null)).toBe(false);
  });
});
