// Live NIST Interoperable Randomness Beacon (Version 2.0) integration.
// Pulls the latest pulse through the server-side /api/nist proxy and
// normalizes it into the shared BeaconEntropy shape.
//
// The beacon posts a full-entropy 512-bit `outputValue` every 60 seconds, each
// pulse signed and chained to the previous one. NIST warns these values must
// not be used as secret keys — fine here, since a public dice roll is exactly
// the kind of publicly verifiable draw the beacon is designed for.

import { hexToBytes, type BeaconEntropy } from "@/lib/entropy/beacon";

interface NistPulseResponse {
  pulse?: {
    chainIndex: number;
    pulseIndex: number;
    timeStamp: string;
    outputValue: string;
  };
}

/** Fetch the latest available pulse from the NIST 2.0 beacon. */
export async function fetchNistEntropy(): Promise<BeaconEntropy> {
  const res = await fetch("/api/nist/pulse/last", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`NIST beacon request failed (${res.status}).`);
  }

  const { pulse } = (await res.json()) as NistPulseResponse;
  if (!pulse?.outputValue) {
    throw new Error("NIST beacon response was missing pulse output value.");
  }

  return {
    bytes: hexToBytes(pulse.outputValue),
    provenance: {
      label: "NIST Beacon 2.0",
      pulse: pulse.pulseIndex,
      timestamp: pulse.timeStamp,
      reference: `chain ${pulse.chainIndex}`,
    },
  };
}
