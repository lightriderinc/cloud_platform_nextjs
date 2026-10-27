import type { LatticeShape, QubitEntry } from "./client";

// Physical placement on the qubit lattice, from the server-supplied
// latticeRow/latticeCol and the descriptor's LatticeShape — nothing
// Cepheus-specific here. Every function returns null when positions aren't
// available (no descriptor on the snapshot), and callers fall back to index
// order rather than guessing a layout.

export interface GridPosition {
  row: number;
  col: number;
}

function hasPosition(q: QubitEntry): q is QubitEntry & { latticeRow: number; latticeCol: number } {
  return q.latticeRow !== null && q.latticeCol !== null;
}

/** A qubit's position inside its own chiplet block (0..chipletSize-1 each way). */
export function cellPositionInChiplet(
  q: QubitEntry,
  lattice: LatticeShape | null,
): GridPosition | null {
  if (!lattice || !hasPosition(q)) return null;
  return { row: q.latticeRow % lattice.chipletSize, col: q.latticeCol % lattice.chipletSize };
}

/** Which chiplet block (row/col in the chiplet array) a chiplet's qubits sit in — null unless every one of them has a position and they all agree. */
export function chipletBlockPosition(
  chipletQubits: QubitEntry[],
  lattice: LatticeShape | null,
): GridPosition | null {
  if (!lattice || chipletQubits.length === 0) return null;
  let block: GridPosition | null = null;
  for (const q of chipletQubits) {
    if (!hasPosition(q)) return null;
    const row = Math.floor(q.latticeRow / lattice.chipletSize);
    const col = Math.floor(q.latticeCol / lattice.chipletSize);
    if (block && (block.row !== row || block.col !== col)) return null;
    block = { row, col };
  }
  return block;
}

/**
 * Orders chiplet ids row-major by their physical block position, so a CSS
 * grid with `lattice.chipletArrayCols` columns places each chiplet where it
 * physically is. Returns null if any chiplet can't be placed — the caller
 * keeps its own (id-based) order then.
 */
export function orderChipletsByPosition(
  qubitsByChiplet: Map<string, QubitEntry[]>,
  lattice: LatticeShape | null,
): string[] | null {
  if (!lattice) return null;
  const placed: { id: string; pos: GridPosition }[] = [];
  for (const [id, qubits] of qubitsByChiplet) {
    const pos = chipletBlockPosition(qubits, lattice);
    if (!pos) return null;
    placed.push({ id, pos });
  }
  placed.sort((a, b) => a.pos.row - b.pos.row || a.pos.col - b.pos.col);
  return placed.map((p) => p.id);
}
