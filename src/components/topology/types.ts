import type { CorridorEntry, EdgeEntry, QubitEntry } from "@/lib/topology/client";

// Shared across the topology view's map, ranking, and detail panel — what's
// currently picked, and the floating tooltip's content/position.

export type Selection =
  | { kind: "qubit"; qubit: QubitEntry }
  | { kind: "edge"; edge: EdgeEntry }
  | { kind: "corridor"; corridor: CorridorEntry };

export interface TooltipState {
  html: string;
  x: number;
  y: number;
}
