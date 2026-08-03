// Live drand / League of Entropy integration.
// Pulls the latest round from the distributed beacon through the server-side
// /api/drand proxy and normalizes it into the shared BeaconEntropy shape.
//
// We read the "quicknet" chain: a new, publicly-verifiable random value is
// produced roughly every 3 seconds by a threshold of independent operators
// (Cloudflare, EPFL, Kudelski, and others), each round chained to the last.

import { hexToBytes, type BeaconEntropy } from "@/lib/entropy/beacon";

// drand quicknet chain hash (fast ~3s cadence).
export const DRAND_QUICKNET_CHAIN =
  "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971";

interface DrandRound {
  round: number;
  randomness: string;
  signature: string;
}

/** Fetch the latest drand quicknet round. */
export async function fetchDrandEntropy(): Promise<BeaconEntropy> {
  const res = await fetch(
    `/api/drand/${DRAND_QUICKNET_CHAIN}/public/latest`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`drand beacon request failed (${res.status}).`);
  }

  const round = (await res.json()) as DrandRound;
  if (!round?.randomness) {
    throw new Error("drand beacon response was missing randomness.");
  }

  return {
    bytes: hexToBytes(round.randomness),
    provenance: {
      label: "drand (League of Entropy)",
      pulse: round.round,
      timestamp: new Date().toISOString(),
      reference: `round ${round.round}`,
    },
  };
}
