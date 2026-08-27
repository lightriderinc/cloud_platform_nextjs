// Shared brand gradient — cyan (low error) -> blue -> purple (high error) —
// same stops as the backend modal's QubitMap, reused everywhere a fidelity
// or error rate needs a color: qubit cells, corridor lines, corridor bars.
const ERROR_STOPS: [number, number, number][] = [
  [0, 228, 148],
  [39, 114, 139],
  [78, 0, 130],
];

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as [
    number,
    number,
    number,
  ];
}

export function errorRateRgb(
  errorPct: number,
  min: number,
  max: number,
): [number, number, number] {
  const t =
    max > min ? Math.max(0, Math.min(1, (errorPct - min) / (max - min))) : 0.5;
  return t < 0.5
    ? mixRgb(ERROR_STOPS[0], ERROR_STOPS[1], t / 0.5)
    : mixRgb(ERROR_STOPS[1], ERROR_STOPS[2], (t - 0.5) / 0.5);
}

// Hover swaps to a brighter tint of the same color rather than a fixed hover
// class, since the base color varies per entity's own error rate.
export function toCss(
  [r, g, b]: [number, number, number],
  brighten = false,
): string {
  if (!brighten) return `rgb(${r}, ${g}, ${b})`;
  const lift = (v: number) => Math.round(v + (255 - v) * 0.35);
  return `rgb(${lift(r)}, ${lift(g)}, ${lift(b)})`;
}

// Corridors are colored by score (mean fCZ x coverage) — the same number
// shown as "Score %" in the ranking table — converted to the same
// error-rate domain so both use one gradient, scaled to the score range
// actually present (scoreRange) rather than the qubit fRB range.
export function scoreColor(
  score: number,
  scoreRange: { lo: number; hi: number },
  brighten = false,
): string {
  const errorPct = (1 - score) * 100;
  const minErrorPct = (1 - scoreRange.hi) * 100;
  const maxErrorPct = (1 - scoreRange.lo) * 100;
  return toCss(errorRateRgb(errorPct, minErrorPct, maxErrorPct), brighten);
}
