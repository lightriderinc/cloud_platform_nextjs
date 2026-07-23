// Entropy generation for the cloud platform, backed by the real EMS egress
// service (light-rider-platform/ems-egress) via /api/ems/entropy.

export const BYTE_PRESETS = [16, 32, 64, 128, 256, 512];
export const MIN_BYTES = 1;
export const MAX_BYTES = 4096;

export type OutputFormat = "hex";

// EMS's single-draw endpoint (`POST /v1/entropy/request`) takes a `policy`
// that routes to a tier pool, not a specific source id — the pool's live
// contributors are resolved server-side and reported back in the receipt's
// `contributing_sources`. This maps each UI source card to the policy that
// primarily routes to the pool feeding that source (see
// ems-egress/src/policy.rs `pool_sources`).
const POLICY_BY_SOURCE_ID: Record<string, string> = {
  "nist-beacon": "cost_optimized", // pool_fastest
  rdseed: "fastest_available", // pool_fastest
  curby: "quantum_verified", // pool_quantum_verified
  "iqm-resonance": "hybrid_mix", // pool_quantum_verified
  "quantum-light-lab": "hybrid_mix", // pool_quantum_verified
};

/** The full signed receipt EMS returns for a draw (entropy-core::receipt::Receipt). */
export interface EntropyReceipt {
  request_id: string;
  application_id: string;
  policy: string;
  contributing_sources: string[];
  pool_id: string;
  quality_score: number;
  rct_pass: boolean;
  apt_pass: boolean;
  extractor_alg: string;
  input_min_entropy_bits: number;
  output_bytes: number;
  drbg_alg: string;
  drbg_reseed_id: string;
  timestamp_unix_ns: number;
  raw_entropy_stored: boolean;
  audit_event_id: string;
  zone_id: string;
  signature_alg: string;
  signature: string;
}

export interface EntropyResult {
  /** Stable id for React keys + history entries. */
  id: string;
  sourceId: string;
  sourceName: string;
  bytes: number;
  format: OutputFormat;
  /** The generated entropy, encoded per `format`. */
  value: string;
  /** Epoch milliseconds the entropy was produced. */
  createdAt: number;
  /** The full receipt EMS returned for this draw. */
  receipt: EntropyReceipt;
}

export interface EntropyRequest {
  sourceId: string;
  sourceName: string;
  bytes: number;
}

export function isValidByteCount(bytes: number): boolean {
  return Number.isInteger(bytes) && bytes >= MIN_BYTES && bytes <= MAX_BYTES;
}

/** Produce entropy for a request by calling the EMS-backed API route. */
export async function requestEntropy({
  sourceId,
  sourceName,
  bytes,
}: EntropyRequest): Promise<EntropyResult> {
  const policy = POLICY_BY_SOURCE_ID[sourceId] ?? "fastest_available";

  const res = await fetch("/api/ems/entropy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "single", policy, bytes }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Entropy request failed (${res.status}).`,
    );
  }

  const receipt = data.receipt as EntropyReceipt;
  return {
    id: receipt.request_id,
    sourceId,
    sourceName,
    bytes,
    format: "hex",
    value: data.bytes_hex as string,
    createdAt: Math.floor(Number(receipt.timestamp_unix_ns) / 1_000_000),
    receipt,
  };
}
