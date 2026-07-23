// Adaptive 2D layout for a qubit connectivity graph. Picks the best method
// from the graph alone (no coordinates needed from the API):
//   - fully-connected (all-to-all)  -> circle
//   - embeds on a square lattice     -> grid, rotated 45deg into a diamond
//   - anything else                  -> force-directed
// Returns positions normalized to the unit square [0,1].

type Coord = [number, number];
type RawPositions = Record<string, Coord>;
export type LayoutPositions = Record<string, { x: number; y: number }>;

interface LayoutNode {
  id: string;
  x?: number;
  y?: number;
}
interface LayoutEdge {
  source: string;
  target: string;
}

function buildAdjacency(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Record<string, string[]> {
  const adj: Record<string, string[]> = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of edges) {
    if (adj[e.source] && adj[e.target]) {
      adj[e.source].push(e.target);
      adj[e.target].push(e.source);
    }
  }
  return adj;
}

function isUnitStep(a: Coord, b: Coord): boolean {
  const dx = Math.abs(a[0] - b[0]);
  const dy = Math.abs(a[1] - b[1]);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

// Backtracking constraint solver: try to place every node on an integer grid
// so each edge is a unit step. Returns null if the graph is not a grid.
function gridEmbed(
  ids: string[],
  adj: Record<string, string[]>,
  edges: LayoutEdge[],
): RawPositions | null {
  // BFS order from a lowest-degree node (a corner), so positions are
  // constrained early.
  const start = [...ids].sort((a, b) => adj[a].length - adj[b].length)[0];
  const order: string[] = [];
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift() as string;
    order.push(cur);
    for (const nb of adj[cur]) {
      if (!seen.has(nb)) {
        seen.add(nb);
        queue.push(nb);
      }
    }
  }
  if (order.length !== ids.length) return null; // disconnected

  const coord: RawPositions = {};
  const occupied = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  let steps = 0;
  const CAP = 2_000_000;

  function place(i: number): boolean {
    if (++steps > CAP) return false;
    if (i === order.length) return true;
    const node = order[i];
    if (i === 0) {
      coord[node] = [0, 0];
      occupied.add(key(0, 0));
      if (place(1)) return true;
      occupied.delete(key(0, 0));
      delete coord[node];
      return false;
    }
    const placedNeighbors = adj[node].filter((n) => coord[n]);
    const base = coord[placedNeighbors[0]];
    const candidates: Coord[] = [
      [base[0] + 1, base[1]],
      [base[0] - 1, base[1]],
      [base[0], base[1] + 1],
      [base[0], base[1] - 1],
    ];
    for (const c of candidates) {
      if (occupied.has(key(c[0], c[1]))) continue;
      if (!placedNeighbors.every((nb) => isUnitStep(c, coord[nb]))) continue;
      coord[node] = c;
      occupied.add(key(c[0], c[1]));
      if (place(i + 1)) return true;
      occupied.delete(key(c[0], c[1]));
      delete coord[node];
    }
    return false;
  }

  if (!place(0)) return null;
  for (const e of edges) {
    if (!isUnitStep(coord[e.source], coord[e.target])) return null;
  }
  return coord;
}

function circleLayout(ids: string[]): RawPositions {
  const out: RawPositions = {};
  ids.forEach((id, i) => {
    const a = (2 * Math.PI * i) / ids.length;
    out[id] = [Math.cos(a), Math.sin(a)];
  });
  return out;
}

// One central hub connected to every other node (e.g. a resonator-coupled
// star chip): hub in the middle, leaves evenly around it.
function starLayout(ids: string[], adj: Record<string, string[]>): RawPositions {
  const n = ids.length;
  const hub = ids.find((id) => adj[id].length === n - 1) as string;
  const leaves = ids.filter((id) => id !== hub);
  const out: RawPositions = { [hub]: [0, 0] };
  leaves.forEach((id, i) => {
    const a = (2 * Math.PI * i) / leaves.length;
    out[id] = [Math.cos(a), Math.sin(a)];
  });
  return out;
}

// Deterministic Fruchterman-Reingold force-directed layout.
function forceLayout(ids: string[], edges: LayoutEdge[]): RawPositions {
  const n = ids.length;
  const pos: RawPositions = {};
  ids.forEach((id, i) => {
    const a = (2 * Math.PI * i) / n;
    pos[id] = [Math.cos(a), Math.sin(a)];
  });
  const k = 1 / Math.sqrt(n);
  let temp = 0.1;
  for (let it = 0; it < 500; it++) {
    const disp: RawPositions = {};
    ids.forEach((id) => (disp[id] = [0, 0]));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = ids[i];
        const b = ids[j];
        let dx = pos[a][0] - pos[b][0];
        let dy = pos[a][1] - pos[b][1];
        const d = Math.hypot(dx, dy) || 1e-4;
        const f = (k * k) / d;
        dx /= d;
        dy /= d;
        disp[a][0] += dx * f;
        disp[a][1] += dy * f;
        disp[b][0] -= dx * f;
        disp[b][1] -= dy * f;
      }
    }
    for (const e of edges) {
      if (!pos[e.source] || !pos[e.target]) continue;
      let dx = pos[e.source][0] - pos[e.target][0];
      let dy = pos[e.source][1] - pos[e.target][1];
      const d = Math.hypot(dx, dy) || 1e-4;
      const f = (d * d) / k;
      dx /= d;
      dy /= d;
      disp[e.source][0] -= dx * f;
      disp[e.source][1] -= dy * f;
      disp[e.target][0] += dx * f;
      disp[e.target][1] += dy * f;
    }
    for (const id of ids) {
      const d = Math.hypot(disp[id][0], disp[id][1]) || 1e-4;
      pos[id][0] += (disp[id][0] / d) * Math.min(d, temp);
      pos[id][1] += (disp[id][1] / d) * Math.min(d, temp);
    }
    temp *= 0.985;
  }
  return pos;
}

// Scale raw coordinates into the unit square, keeping aspect ratio and
// centering, with padding so nodes near the edge are not clipped.
function normalize(raw: RawPositions, pad = 0.08): LayoutPositions {
  const pts = Object.values(raw);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const span = Math.max(spanX, spanY);
  const offX = (span - spanX) / 2;
  const offY = (span - spanY) / 2;
  const out: LayoutPositions = {};
  const scale = 1 - 2 * pad;
  for (const id in raw) {
    out[id] = {
      x: pad + ((raw[id][0] - minX + offX) / span) * scale,
      y: pad + ((raw[id][1] - minY + offY) / span) * scale,
    };
  }
  return out;
}

export function computeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): LayoutPositions {
  const ids = nodes.map((n) => n.id);
  const n = ids.length;
  if (n === 0) return {};
  if (n === 1) return { [ids[0]]: { x: 0.5, y: 0.5 } };

  // Explicit coordinates from the API (e.g. IBM's heavy-hex layout) take
  // precedence over inferring a layout from the connectivity graph.
  if (nodes.every((nd) => typeof nd.x === "number" && typeof nd.y === "number")) {
    const raw: RawPositions = {};
    for (const nd of nodes) raw[nd.id] = [nd.x as number, nd.y as number];
    return normalize(raw);
  }

  // Fully connected (all-to-all) -> circle.
  if (edges.length === (n * (n - 1)) / 2) {
    return normalize(circleLayout(ids));
  }

  // Square lattice -> grid rotated 45deg into a diamond.
  const adj = buildAdjacency(nodes, edges);

  // Star: a single hub connected to every other node (e.g. a resonator).
  if (edges.length === n - 1 && ids.some((id) => adj[id].length === n - 1)) {
    return normalize(starLayout(ids, adj));
  }

  const grid = gridEmbed(ids, adj, edges);
  if (grid) {
    const rotated: RawPositions = {};
    for (const id in grid) {
      rotated[id] = [grid[id][0] - grid[id][1], grid[id][0] + grid[id][1]];
    }
    return normalize(rotated);
  }

  // Fallback: force-directed.
  return normalize(forceLayout(ids, edges));
}
