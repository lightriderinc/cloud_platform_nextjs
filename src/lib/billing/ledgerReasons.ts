// CreditLedgerEntry `reason` prefixes that several modules need, kept free of
// imports so anything (planCheck, routes, entropyCharges) can use them without
// an import cycle.

/** Entropy-platform draw debits: "entropy:draw:<mode>" (lib/billing/entropyCharges.ts). */
export const ENTROPY_DRAW_PREFIX = "entropy:draw:";
/** Entropy-platform refunds of undelivered draws: "entropy:refund:<mode>". */
export const ENTROPY_REFUND_PREFIX = "entropy:refund:";
