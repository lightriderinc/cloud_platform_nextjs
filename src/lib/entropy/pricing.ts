// Rigetti's measured hardware cost for entropy withdrawal is $0.0000334/bit --
// this rate is a 2x margin over that measured cost, not a fee stacked on top
// of some other base price. Same fractional-cents-per-unit convention as
// QUANTUM_BACKENDS.costPerShotCents (backends.ts), so it composes with the
// same Math.ceil-at-charge-time rounding rule creditsBalanceCents/
// CreditLedgerEntry.amountCents (both Int columns) require.
export const ENTROPY_COST_PER_BIT_CENTS = 0.00668; // $0.0000668/bit ($66.80 per million bits)

export function entropyCostCents(totalBits: number): number {
  return Math.ceil(Math.max(0, totalBits) * ENTROPY_COST_PER_BIT_CENTS);
}

/** "$0.0000668" -- derived from ENTROPY_COST_PER_BIT_CENTS rather than a
 * separate literal, so the displayed rate can never drift from the one
 * actually used to compute a charge. */
export function entropyPricePerBitLabel(): string {
  return `$${(ENTROPY_COST_PER_BIT_CENTS / 100).toFixed(7)}`;
}
