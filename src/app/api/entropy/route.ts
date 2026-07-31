import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { fetchNistBeaconEntropy } from "@/lib/nistBeacon";

export const dynamic = "force-dynamic";

const LR_BASE_URL = process.env.LR_BASE_URL ?? "http://93.127.215.63";
const LR_TOKEN = process.env.LR_TOKEN;
const SHOTS = 2000; // same order of magnitude as the default in NewJobModal
const POLL_INTERVAL_MS = 750;
const POLL_TIMEOUT_MS = 15000;

async function lr(path: string, init?: RequestInit) {
  const res = await fetch(`${LR_BASE_URL}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LR_TOKEN}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LR API ${path} -> HTTP ${res.status}`);
  return res.json();
}

async function fetchQuantumEntropy(numBytes: number): Promise<{ bytes: Uint8Array; jobId: string }> {
  const job = await lr("jobs", {
    method: "POST",
    body: JSON.stringify({ gate: "h", shots: SHOTS }),
    headers: { "Content-Type": "application/json" },
  });
  const jobId: string = job.uuid ?? job.job_uuid ?? job.id;
  if (!jobId) throw new Error("LR job submission did not return an id");

  let status: string = job.status;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (status !== "COMPLETED" && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const detail = await lr(`jobs/${jobId}`);
    status = detail.status;
    if (status === "FAILED" || status === "ABORTED") {
      throw new Error(`LR job ${jobId} ended with status ${status}`);
    }
  }
  if (status !== "COMPLETED") {
    throw new Error(`LR job ${jobId} did not complete within ${POLL_TIMEOUT_MS}ms`);
  }

  const result = await lr(`jobs/${jobId}/result`);
  const counts: Record<string, number> = result.counts ?? result.measurement_counts ?? result;

  const ikm = new TextEncoder().encode(jobId + JSON.stringify(counts));
  const bytes = hkdf(sha256, ikm, undefined, new TextEncoder().encode("lr-quantum-entropy-v1"), numBytes);
  return { bytes, jobId };
}

/**
 * GET /api/entropy?source=<id>&bytes=<n>
 *
 * Free-tier customers select an entropy source in Quantum Vault's "My Keys"
 * tab to try a real, verifiable entropy source without needing access to
 * LightRider's own quantum hardware. Previously this route ignored which
 * source was selected entirely — every choice silently fell through to the
 * same LightRider-hardware-or-CSPRNG path. Now "NIST Beacon" is genuinely
 * wired to NIST's real public Randomness Beacon 2.0.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const numBytes = Math.min(Math.max(parseInt(searchParams.get("bytes") || "64", 10), 1), 4096);
  const source = searchParams.get("source");

  if (source === "nist-beacon") {
    const nist = await fetchNistBeaconEntropy(numBytes);
    if (nist.reachable) {
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
        "X-Entropy-Source": "nist-beacon",
      };
      if (nist.pulseUri) headers["X-Entropy-Verification-Url"] = nist.pulseUri;
      return new Response(Buffer.from(nist.bytes), { headers });
    }
    // NIST unreachable — fall through to CSPRNG below, honestly labeled.
  } else if (LR_TOKEN) {
    try {
      const { bytes, jobId } = await fetchQuantumEntropy(numBytes);
      return new Response(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Entropy-Source": "lr-quantum-job",
          "X-Entropy-Job-Id": jobId,
        },
      });
    } catch (err) {
      console.error("Quantum entropy job failed, falling back to CSPRNG:", err);
    }
  }

  const bytes = randomBytes(numBytes);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Entropy-Source": "csprng-fallback",
    },
  });
}