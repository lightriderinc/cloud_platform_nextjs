import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { fetchCurbyEntropy } from "@/lib/curby";
import { fetchNistBeaconEntropy } from "@/lib/nistBeacon";
import { runHealthCheck } from "@/lib/entropyHealthCheck";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch both real public sources in parallel — independent of each
    // other, so a slow/failed one doesn't block the other.
    const [nist, curby] = await Promise.all([fetchNistBeaconEntropy(32), fetchCurbyEntropy(32)]);

    const combinedBytes = createHash("sha256")
      .update(Buffer.concat([nist.bytes, curby.bytes]))
      .digest()
      .subarray(0, 32);

    const health = runHealthCheck(Buffer.from(combinedBytes));

    return NextResponse.json({
      bytesHex: Buffer.from(combinedBytes).toString("hex"),

      nist: {
        live: nist.live,
        reachable: nist.reachable,
        pulseUri: nist.pulseUri,
        pulseTimestamp: nist.pulseTimestamp,
        pulseAgeSeconds: nist.pulseAgeSeconds,
        note: nist.note,
      },

      curby: {
        reachable: curby.curbyReachable,
        note: curby.note,
      },

      health,
    });
  } catch (err) {
    // A top-level safety net: no matter what goes wrong above, this always
    // returns a proper JSON error instead of letting an exception escape
    // and potentially take down the whole server process.
    console.error("Entropy fetch route failed unexpectedly:", err);
    return NextResponse.json({ error: "Entropy fetch failed — check server logs" }, { status: 500 });
  }
}