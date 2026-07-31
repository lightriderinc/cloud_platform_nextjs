export interface HealthCheckResult {
  bitBalance: { onesPercent: number; pass: boolean }; // should be close to 50%
  chiSquare: { value: number; pass: boolean };         // rough goodness-of-fit vs uniform byte distribution
  longestRun: { bits: number; pass: boolean };          // longest streak of identical bits
  overallPass: boolean;
}

/**
 * Basic sanity checks, NOT a rigorous randomness test suite (that would be
 * something like the full NIST SP 800-22 battery, which needs far more data
 * than a 32-byte sample to be meaningful). These are illustrative checks
 * that would catch an obviously broken source (e.g. all zeros, a stuck
 * counter) — not a certification that a source is cryptographically sound.
 */
export function runHealthCheck(bytes: Buffer): HealthCheckResult {
  const bits: number[] = [];
  for (const byte of bytes) {
    for (let i = 0; i < 8; i++) bits.push((byte >> i) & 1);
  }

  // Bit balance: fraction of 1s should be roughly 50% for random data.
  const ones = bits.filter((b) => b === 1).length;
  const onesPercent = (ones / bits.length) * 100;
  const bitBalancePass = onesPercent > 30 && onesPercent < 70; // loose threshold, small sample

  // Chi-squared goodness-of-fit against a uniform distribution over byte values.
  const counts = new Array(256).fill(0);
  for (const byte of bytes) counts[byte]++;
  const expected = bytes.length / 256;
  const chiSquare = counts.reduce((sum, observed) => sum + (observed - expected) ** 2 / (expected || 1), 0);
  // With very small samples this statistic isn't reliable — treat as illustrative only.
  const chiSquarePass = true; // not gating on this with so few bytes; shown for transparency, not enforced

  // Longest run of identical consecutive bits — a stuck/broken source often
  // produces long runs; real random data rarely runs long relative to length.
  let longestRun = 1;
  let currentRun = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] === bits[i - 1]) {
      currentRun++;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 1;
    }
  }
  const longestRunPass = longestRun < bits.length * 0.4; // very loose — catches obviously stuck sources

  return {
    bitBalance: { onesPercent: Math.round(onesPercent * 10) / 10, pass: bitBalancePass },
    chiSquare: { value: Math.round(chiSquare * 100) / 100, pass: chiSquarePass },
    longestRun: { bits: longestRun, pass: longestRunPass },
    overallPass: bitBalancePass && longestRunPass,
  };
}
