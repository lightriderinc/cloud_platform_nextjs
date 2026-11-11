// CreditLedgerEntry `reason` prefixes that several modules need, kept free of
// imports so anything (planCheck, routes, entropyCharges) can use them without
// an import cycle.

/** Entropy-platform draw debits: "entropy:draw:<mode>" (lib/billing/entropyCharges.ts). */
export const ENTROPY_DRAW_PREFIX = "entropy:draw:";
/** Entropy-platform refunds of undelivered draws: "entropy:refund:<mode>". */
export const ENTROPY_REFUND_PREFIX = "entropy:refund:";
/** Quantum job debits: "quantum_job:<backend>" (api/lr/quantum/submit). */
export const QUANTUM_JOB_PREFIX = "quantum_job:";
/**
 * Refund of a per-job (IonQ Forte) charge whose job qpu-proxy then refused or
 * never received: "quantum_job_refund:<backend>". Like an entropy refund it
 * only returns credits already spent, so it must never count as a purchase
 * or unlock real hardware.
 */
export const QUANTUM_JOB_REFUND_PREFIX = "quantum_job_refund:";
