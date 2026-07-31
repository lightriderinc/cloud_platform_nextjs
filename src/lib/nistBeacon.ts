import { randomBytes as nodeRandomBytes, createHash } from "node:crypto";

// NIST posts a new pulse every 60 seconds (per their own documentation).
// A 150-second staleness threshold gives a generous buffer over that period
// before concluding the service itself has stopped updating.
const NIST_BEACON_URL = "https://beacon.nist.gov/beacon/2.0/pulse/last";
const STALE_THRESHOLD_MS = 150_000;

export interface NistBeaconResult {
  bytes: Buffer;
  live: boolean;
  reachable: boolean;
  pulseUri: string | null;
  pulseTimestamp: string | null;
  pulseAgeSeconds: number | null;
  note: string;
}

/**
 * Fetches the latest pulse from NIST's Randomness Beacon 2.0 and mixes it
 * with fresh local randomness.
 *
 * IMPORTANT — NIST's own documentation states: "DO NOT USE BEACON GENERATED
 * VALUES AS SECRET CRYPTOGRAPHIC KEYS." This function honors that: the raw
 * beacon value is never used alone. It's combined with independent local
 * randomness and hashed, so the final output's security never depends on the
 * beacon value by itself — appropriate for a public/verifiable-randomness
 * display, not for generating private keys.
 *
 * Freshness check: unlike CURBy's dual-fetch comparison (appropriate there
 * because CURBy's actual pulse cadence isn't 60 seconds), NIST's beacon is
 * documented to post a new pulse every 60 seconds — fetching it twice a
 * couple seconds apart would almost always show "identical" simply because
 * no new pulse landed in that tiny window, which would be a false
 * "offline" reading, not a real one. Instead, this checks the pulse's own
 * timestamp against the current time — a much more honest signal for this
 * specific API's behavior.
 */
export async function fetchNistBeaconEntropy(numBytes = 32): Promise<NistBeaconResult> {
  try {
    const res = await fetch(NIST_BEACON_URL, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`NIST beacon returned HTTP ${res.status}`);
    const data = await res.json();
    const pulse = data?.pulse;
    const localRandomValue: unknown = pulse?.localRandomValue;
    const timeStamp: unknown = pulse?.timeStamp;
    const uri: unknown = pulse?.uri;

    if (typeof localRandomValue !== "string" || !/^[0-9a-fA-F]+$/.test(localRandomValue)) {
      throw new Error("NIST beacon response missing a valid localRandomValue");
    }

    const pulseTimeMs = typeof timeStamp === "string" ? Date.parse(timeStamp) : NaN;
    const ageMs = Number.isFinite(pulseTimeMs) ? Date.now() - pulseTimeMs : null;
    const live = ageMs !== null && ageMs >= 0 && ageMs < STALE_THRESHOLD_MS;

    const nistBytes = Buffer.from(localRandomValue, "hex");
    const localBytes = nodeRandomBytes(numBytes);
    const finalBytes = createHash("sha256")
      .update(Buffer.concat([nistBytes, localBytes]))
      .digest()
      .subarray(0, numBytes);

    return {
      bytes: Buffer.from(finalBytes),
      live,
      reachable: true,
      pulseUri: typeof uri === "string" ? uri : null,
      pulseTimestamp: typeof timeStamp === "string" ? timeStamp : null,
      pulseAgeSeconds: ageMs !== null ? Math.round(ageMs / 1000) : null,
      note: live
        ? "NIST's beacon pulse is current — mixed with fresh local randomness as an extra safeguard, never used alone (per NIST's own guidance)."
        : "NIST's beacon pulse looks older than expected — the service may be temporarily down. Mixed with fresh local randomness so this stays safe to use either way.",
    };
  } catch (err) {
    console.error("NIST beacon fetch failed:", err);
    return {
      bytes: nodeRandomBytes(numBytes),
      live: false,
      reachable: false,
      pulseUri: null,
      pulseTimestamp: null,
      pulseAgeSeconds: null,
      note: "NIST beacon unreachable — using local randomness only.",
    };
  }
}