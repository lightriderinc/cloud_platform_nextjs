import { Client } from "@buff-beacon-project/curby-client";
import { randomBytes as nodeRandomBytes, createHash } from "node:crypto";

export interface CurbyResult {
  bytes: Buffer;           // final entropy: CURBy data mixed with fresh local randomness
  curbyReachable: boolean; // false if CURBy couldn't be reached at all
  note: string;
}

/**
 * Pulls whatever unique data is available from a CURBy randomness object,
 * without assuming an exact field name (the library's returned shape isn't
 * something I could verify from a sandboxed environment with no route to
 * CURBy's servers — this defensively hashes the whole object so it still
 * produces valid, unique entropy even if my guess at field names below is
 * wrong).
 */
function extractBytes(randomnessObj: unknown): Buffer {
  const candidateFields = ["value", "raw", "hex", "hash", "randomHex"];
  if (randomnessObj && typeof randomnessObj === "object") {
    for (const field of candidateFields) {
      const val = (randomnessObj as Record<string, unknown>)[field];
      if (typeof val === "string" && /^[0-9a-fA-F]+$/.test(val) && val.length >= 16) {
        return Buffer.from(val, "hex");
      }
    }
  }
  return createHash("sha256").update(JSON.stringify(randomnessObj)).digest();
}

/**
 * A single fetch — no artificial delay, no second round trip. The previous
 * version fetched twice with a hardcoded 1.5s wait in between to guess at
 * whether CURBy's live source was stale, but that heuristic was never
 * confirmed to actually work (I could never reach CURBy's servers from my
 * build sandbox to verify its real pulse cadence), and it made every request
 * slower for a signal I wasn't fully confident in. This version is honest
 * about what it can actually tell you: reachable or not, nothing more.
 */
export async function fetchCurbyEntropy(numBytes = 32): Promise<CurbyResult> {
  let curbyBytes: Buffer | null = null;
  let reachable = true;

  try {
    const client = Client.create();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("CURBy request timed out")), 5000)
    );
    const result = await Promise.race([client.randomness(), timeout]);
    curbyBytes = extractBytes(result);
  } catch (err) {
    console.error("CURBy fetch failed:", err);
    reachable = false;
  }

  const localBytes = nodeRandomBytes(numBytes);
  const combinedInput = Buffer.concat([curbyBytes ?? Buffer.alloc(0), localBytes]);
  const finalBytes = createHash("sha256").update(combinedInput).digest().subarray(0, numBytes);

  const note = reachable
    ? "CURBy responded — mixed with fresh local randomness as an extra safeguard."
    : "CURBy unreachable — using local randomness only.";

  return {
    bytes: finalBytes,
    curbyReachable: reachable,
    note,
  };
}