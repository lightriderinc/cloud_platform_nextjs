// Live ANU Quantum Random Number Generator integration.
// Pulls true quantum randomness through the server-side /api/anu proxy and
// normalizes it into the shared BeaconEntropy shape.
//
// ANU's QRNG measures the quantum vacuum's fluctuating electromagnetic field
// and digitizes it into random bytes — a genuine physical quantum source. The
// free endpoint returns the requested bytes directly as a uint8 array.

import type { BeaconEntropy } from "@/lib/entropy/beacon";

// Bytes fetched per request. A larger chunk means fewer calls to ANU's
// rate-limited endpoint (one buffer serves many rolls). Max allowed is 1024.
const ANU_CHUNK_BYTES = 64;

interface AnuResponse {
  type?: string;
  length?: number;
  data?: number[];
  success?: boolean;
}

/** Fetch a chunk of true quantum randomness from the ANU QRNG. */
export async function fetchAnuEntropy(): Promise<BeaconEntropy> {
  const res = await fetch(
    `/api/anu/API/jsonI.php?length=${ANU_CHUNK_BYTES}&type=uint8`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`ANU QRNG request failed (${res.status}).`);
  }

  const body = (await res.json()) as AnuResponse;
  if (!body?.success || !Array.isArray(body.data) || body.data.length === 0) {
    throw new Error("ANU QRNG response did not contain random data.");
  }

  return {
    bytes: Uint8Array.from(body.data, (n) => n & 0xff),
    provenance: {
      label: "ANU Quantum RNG",
      timestamp: new Date().toISOString(),
      reference: "quantum vacuum fluctuations",
    },
  };
}
