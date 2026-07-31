// Live CURBy (CU Randomness Beacon, University of Colorado Boulder) integration.
// Pulls certified randomness pulses through the server-side /api/curby proxy
// and normalizes them into the shared BeaconEntropy shape.
//
// CURBy exposes several chains. We read CURBy-RNG — the classical
// "modified NIST Randomness Beacon protocol" chain (its own metadata:
// "Random number chain using a modified version of the NIST Randomness Beacon
// protocol"). The device-independent quantum chain (CURBy-Q, /curbyq/*) is a
// separate source and is deliberately NOT used here: it is currently offline,
// and the dice roller advertises the classical generator only.

import type { BeaconEntropy } from "@/lib/entropy/beacon";

// CID of the CURBy-RNG chain (the classical computer entropy generator).
export const CURBY_RNG_CHAIN_CID =
  "bafyriqci6f3st2mg7gq733ho4zvvth32zpy2mtiylixwmhoz6d627eo3jfpmbxepe54u2zdvymonq5sp3armtm4rodxsynsirr5g3xsbd3q4s";

// DAG-JSON encodes byte fields as { "/": { "bytes": "<base64>" } }.
interface DagBytes {
  "/": { bytes: string };
}

interface CurbyPulse {
  cid: { "/": string };
  data: {
    content: {
      index: number;
      payload: {
        pre: DagBytes;
        salt: DagBytes;
        timestamp: string;
      };
    };
  };
}

// DAG-JSON uses the standard base64 alphabet, usually without padding. Accept
// the URL-safe alphabet too, then pad, so decoding is robust either way.
function decodeDagBytes(b64: string): Uint8Array {
  const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Fetch the latest certified pulse from the CURBy-RNG classical beacon. */
export async function fetchCurbyEntropy(): Promise<BeaconEntropy> {
  const res = await fetch(
    `/api/curby/chains/${CURBY_RNG_CHAIN_CID}/pulses/latest`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`CURBy beacon request failed (${res.status}).`);
  }

  const pulse = (await res.json()) as CurbyPulse;
  const payload = pulse?.data?.content?.payload;
  const b64 = payload?.pre?.["/"]?.bytes;
  if (!b64) {
    throw new Error("CURBy beacon response was missing pulse randomness.");
  }

  const pulseCid = pulse.cid["/"];
  return {
    bytes: decodeDagBytes(b64),
    provenance: {
      label: "CURBy-RNG",
      pulse: pulse.data.content.index,
      timestamp: payload.timestamp,
      reference: `pulse ${pulseCid.slice(0, 14)}…`,
    },
  };
}
