// Shared helpers for external randomness-beacon-backed dice rolls.
//
// Each beacon integration (CURBy, NIST, ...) fetches a pulse through its own
// server-side proxy and normalizes it into a `BeaconEntropy`: the raw bytes to
// roll from, plus provenance for the result screen. The dice modal then treats
// every beacon uniformly, so adding another source is just a new client that
// returns this shape.

/** Human-readable provenance for an entropy draw, shown on the result screen. */
export interface BeaconProvenance {
  /** Short attribution, e.g. "CURBy-RNG", "NIST Beacon 2.0", "IQM (mock)". */
  label: string;
  /**
   * Pulse index within the beacon's chain, for pulse-based beacons. Omitted by
   * sources with no pulse concept (e.g. a one-off quantum circuit job).
   */
  pulse?: number;
  /** ISO-8601 timestamp the entropy was produced. */
  timestamp: string;
  /** Short verification hint (e.g. a CID fragment, chain id, or job id). */
  reference: string;
}

/** Entropy normalized across sources: bytes to roll from + its provenance. */
export interface BeaconEntropy {
  /** Raw randomness bytes to consume. */
  bytes: Uint8Array;
  provenance: BeaconProvenance;
}

/**
 * Consume one unbiased value in [1, sides] from `bytes` starting at `offset`.
 *
 * Uses rejection sampling so the mapping from bytes to faces is uniform (a
 * plain `byte % sides` would bias low faces whenever 256 isn't a multiple of
 * `sides`). Returns the rolled value and the offset just past the byte(s)
 * consumed, or null if the buffer is exhausted before an acceptable byte is
 * found (the caller should then fetch a fresh pulse).
 */
export function rollFromBytes(
  bytes: Uint8Array,
  offset: number,
  sides: number,
): { value: number; nextOffset: number } | null {
  const limit = 256 - (256 % sides); // largest multiple of `sides` <= 256
  let i = offset;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < limit) return { value: (b % sides) + 1, nextOffset: i };
  }
  return null;
}

/** Decode a hex string (e.g. NIST `outputValue`) into bytes. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) {
    throw new Error("Hex string has an odd length.");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
