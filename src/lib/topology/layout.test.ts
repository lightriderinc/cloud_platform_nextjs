import { describe, expect, test } from "vitest";
import { qubit } from "./__fixtures__/entries";
import type { LatticeShape, QubitEntry } from "./client";
import { cellPositionInChiplet, chipletBlockPosition, orderChipletsByPosition } from "./layout";

// Cepheus's real shape: 9x12 row-major lattice, 3x3 chiplets in a 3x4 array,
// chiplet = blockRow * 3 + blockCol + 1 (same formula as rigetti-proxy's chiplets.py).
const lattice: LatticeShape = { width: 9, height: 12, chipletSize: 3, chipletArrayCols: 3, chipletArrayRows: 4 };
const qubits: QubitEntry[] = Array.from({ length: 108 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9;
  return qubit(i, { latticeRow: r, latticeCol: c, chipletId: `C${Math.floor(r / 3) * 3 + Math.floor(c / 3) + 1}` });
});
const byChiplet = new Map<string, QubitEntry[]>();
for (const q of qubits) byChiplet.set(q.chipletId as string, [...(byChiplet.get(q.chipletId as string) ?? []), q]);

describe("layout", () => {
  test("cell position is local to the chiplet block", () => {
    expect(cellPositionInChiplet(qubits[14], lattice)).toEqual({ row: 1, col: 2 }); // q14 = (1,5) in C2
    expect(cellPositionInChiplet(qubits[15], lattice)).toEqual({ row: 1, col: 0 }); // q15 = (1,6) in C3
    expect(cellPositionInChiplet(qubits[8], lattice)).toEqual({ row: 0, col: 2 }); // absent q8 still placed
  });

  test("every chiplet's 9 cells fill its 3x3 block exactly once", () => {
    for (const qs of byChiplet.values()) {
      expect(new Set(qs.map((q) => JSON.stringify(cellPositionInChiplet(q, lattice)))).size).toBe(9);
    }
  });

  test("chiplet block position", () => {
    expect(chipletBlockPosition(byChiplet.get("C1")!, lattice)).toEqual({ row: 0, col: 0 });
    expect(chipletBlockPosition(byChiplet.get("C8")!, lattice)).toEqual({ row: 2, col: 1 });
  });

  test("physical ordering is row-major over blocks", () => {
    const shuffled = new Map([...byChiplet].reverse());
    expect(orderChipletsByPosition(shuffled, lattice)).toEqual(Array.from({ length: 12 }, (_, i) => `C${i + 1}`));
  });

  test("null lattice or missing positions -> null (caller falls back)", () => {
    expect(cellPositionInChiplet(qubits[0], null)).toBeNull();
    expect(orderChipletsByPosition(byChiplet, null)).toBeNull();
    const broken = new Map(byChiplet);
    broken.set("C1", [{ ...qubits[0], latticeRow: null, latticeCol: null }]);
    expect(orderChipletsByPosition(broken, lattice)).toBeNull();
  });

  test("mixed blocks within one chiplet -> null, never a guessed position", () => {
    expect(chipletBlockPosition([qubits[0], qubits[3]], lattice)).toBeNull();
  });
});
