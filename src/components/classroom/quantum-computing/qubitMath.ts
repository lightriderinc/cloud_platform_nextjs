export type Complex = { re: number; im: number };

export type Qubit = { alpha: Complex; beta: Complex };

const c = (re: number, im = 0): Complex => ({ re, im });

function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function cMul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function cConjMul(a: Complex, b: Complex): Complex {
  return cMul({ re: a.re, im: -a.im }, b);
}

function cAbs2(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

type Matrix2 = [[Complex, Complex], [Complex, Complex]];

const SQRT1_2 = 1 / Math.sqrt(2);

export type GateName = "X" | "Y" | "Z" | "H" | "S";

export const GATE_MATRICES: Record<GateName, Matrix2> = {
  X: [
    [c(0), c(1)],
    [c(1), c(0)],
  ],
  Y: [
    [c(0), c(0, -1)],
    [c(0, 1), c(0)],
  ],
  Z: [
    [c(1), c(0)],
    [c(0), c(-1)],
  ],
  H: [
    [c(SQRT1_2), c(SQRT1_2)],
    [c(SQRT1_2), c(-SQRT1_2)],
  ],
  S: [
    [c(1), c(0)],
    [c(0), c(0, 1)],
  ],
};

export const ZERO: Qubit = { alpha: c(1), beta: c(0) };
export const ONE: Qubit = { alpha: c(0), beta: c(1) };
export const PLUS: Qubit = { alpha: c(SQRT1_2), beta: c(SQRT1_2) };
export const MINUS: Qubit = { alpha: c(SQRT1_2), beta: c(-SQRT1_2) };
export const PLUS_I: Qubit = { alpha: c(SQRT1_2), beta: c(0, SQRT1_2) };
export const MINUS_I: Qubit = { alpha: c(SQRT1_2), beta: c(0, -SQRT1_2) };

export function applyGate(gate: GateName, q: Qubit): Qubit {
  const m = GATE_MATRICES[gate];
  return {
    alpha: cAdd(cMul(m[0][0], q.alpha), cMul(m[0][1], q.beta)),
    beta: cAdd(cMul(m[1][0], q.alpha), cMul(m[1][1], q.beta)),
  };
}

export function probabilities(q: Qubit): { p0: number; p1: number } {
  return { p0: cAbs2(q.alpha), p1: cAbs2(q.beta) };
}

export function blochVector(q: Qubit): { x: number; y: number; z: number } {
  const cross = cConjMul(q.alpha, q.beta);
  const { p0, p1 } = probabilities(q);
  return { x: 2 * cross.re, y: 2 * cross.im, z: p0 - p1 };
}

export function measureOne(q: Qubit): 0 | 1 {
  return Math.random() < probabilities(q).p0 ? 0 : 1;
}

export function formatAmplitude(a: Complex): string {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const re = round(a.re);
  const im = round(a.im);
  if (im === 0) return `${re}`;
  if (re === 0) return `${im}i`;
  return `${re}${im > 0 ? " + " : " - "}${Math.abs(im)}i`;
}
