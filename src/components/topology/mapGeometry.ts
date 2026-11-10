// Pure geometry for the processor map's overlay — rectangles in (already
// measured, relative to the map wrapper), segments/bands out. No DOM here.
//
// Everything the overlay draws lives in the GAPS between rectangles, never
// on top of a qubit cell or a chiplet header: a coupler is the part of the
// line between two cell centers that lies outside both of its clip
// rectangles, and a corridor is the gap between two chiplet boxes.

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function center(r: Rect): { x: number; y: number } {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Distance (in units of d) from p, along d, to where the ray leaves r. p is assumed inside r. */
function rayExit(p: { x: number; y: number }, d: { x: number; y: number }, r: Rect): number {
  let t = Infinity;
  if (d.x > 0) t = Math.min(t, (r.left + r.width - p.x) / d.x);
  if (d.x < 0) t = Math.min(t, (r.left - p.x) / d.x);
  if (d.y > 0) t = Math.min(t, (r.top + r.height - p.y) / d.y);
  if (d.y < 0) t = Math.min(t, (r.top - p.y) / d.y);
  return Math.max(0, t);
}

/**
 * The part of the line from a's center to b's center that lies outside
 * clipA and clipB. For an intra-chiplet coupler the clip rects are the two
 * cells (the segment spans the cell gap); for an inter-chiplet coupler
 * they're the two chiplet boxes (the segment spans the chiplet gap, aligned
 * with the qubits). null when nothing of the line is left outside the clips.
 */
export function couplerSegment(a: Rect, b: Rect, clipA: Rect, clipB: Rect): Segment | null {
  const ca = center(a);
  const cb = center(b);
  const d = { x: cb.x - ca.x, y: cb.y - ca.y };
  if (d.x === 0 && d.y === 0) return null;
  const tA = rayExit(ca, d, clipA);
  const tB = rayExit(cb, { x: -d.x, y: -d.y }, clipB);
  if (tA + tB >= 1) return null;
  return { x1: ca.x + tA * d.x, y1: ca.y + tA * d.y, x2: cb.x - tB * d.x, y2: cb.y - tB * d.y };
}

/** The gap between two side-by-side or stacked boxes, over the span they share. null if they overlap or share no span. */
export function gapBand(a: Rect, b: Rect): Rect | null {
  const [left, right] = a.left <= b.left ? [a, b] : [b, a];
  if (left.left + left.width <= right.left) {
    const top = Math.max(a.top, b.top);
    const bottom = Math.min(a.top + a.height, b.top + b.height);
    if (bottom <= top) return null;
    return { left: left.left + left.width, top, width: right.left - (left.left + left.width), height: bottom - top };
  }
  const [upper, lower] = a.top <= b.top ? [a, b] : [b, a];
  if (upper.top + upper.height <= lower.top) {
    const l = Math.max(a.left, b.left);
    const r = Math.min(a.left + a.width, b.left + b.width);
    if (r <= l) return null;
    return { left: l, top: upper.top + upper.height, width: r - l, height: lower.top - (upper.top + upper.height) };
  }
  return null;
}
