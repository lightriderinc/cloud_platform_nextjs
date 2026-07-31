// Quantum-backed entropy for the dice roller (Option C: one fixed circuit).
//
// Submits a small fixed circuit — an H on each of 8 qubits, then measure — to
// an IQM mock simulator via the existing /api/lr/quantum/submit pipeline, waits
// for it to finish, and turns the single measured bitstring into one uniform
// entropy byte. That byte then flows through the same buffer + rollFromBytes
// path the randomness beacons use, so the die roll genuinely comes from a
// circuit executed on the mock backend.
//
// Only Clifford gates (h, measure) are used, so this works regardless of which
// gate set the mock accepts. shots=1 keeps it to a single quantum sample per
// job (aggregate counts don't preserve per-shot order, so one shot is the clean
// way to get an unbiased value); the caller re-submits when it needs more bytes.

import type { BeaconEntropy } from "@/lib/entropy/beacon";
import type { QuantumBackendId } from "@/lib/quantum/backends";
import {
  fetchQuantumJobDetail,
  fetchQuantumJobResult,
  submitQuantumJob,
} from "@/lib/quantum/client";

// Free, unlimited mock simulator (see lib/quantum/backends.ts). 8 qubits is
// safely within every IQM device's qubit budget and yields exactly one byte.
const DICE_BACKEND: QuantumBackendId = "iqm-garnet-mock";
const DICE_QUBITS = 8;
const BACKEND_LABEL = "IQM Garnet (mock)";

// Fixed circuit: H on every qubit, then measure every qubit. One shot gives a
// uniform DICE_QUBITS-bit value.
const DICE_CIRCUIT = {
  num_qubits: DICE_QUBITS,
  instructions: [
    ...Array.from({ length: DICE_QUBITS }, (_, q) => ({
      name: "h",
      qubits: [q],
    })),
    ...Array.from({ length: DICE_QUBITS }, (_, q) => ({
      name: "measure",
      qubits: [q],
      clbits: [q],
    })),
  ],
};

const POLL_INTERVAL_MS = 400;
const POLL_TIMEOUT_MS = 20_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Submit the fixed circuit to the IQM mock and return one measured byte. */
export async function fetchIqmEntropy(): Promise<BeaconEntropy> {
  const handle = await submitQuantumJob(DICE_BACKEND, DICE_CIRCUIT, 1);

  const start = Date.now();
  // Poll until the job reaches a terminal state.
  for (;;) {
    const detail = await fetchQuantumJobDetail(handle.uuid);
    const terminal =
      detail.isInTerminalState ||
      detail.status === "COMPLETED" ||
      detail.status === "FAILED" ||
      detail.status === "ABORTED";
    if (terminal) {
      if (detail.status !== "COMPLETED") {
        throw new Error(`IQM job ${detail.status.toLowerCase()}.`);
      }
      break;
    }
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      throw new Error("IQM job timed out.");
    }
    await sleep(POLL_INTERVAL_MS);
  }

  const counts = await fetchQuantumJobResult(handle.uuid);
  const bitstring = counts ? Object.keys(counts)[0] : undefined;
  if (!bitstring) {
    throw new Error("IQM job returned no measurement.");
  }

  // Every qubit is an independent H, so the measured bits are a uniform byte
  // regardless of bit ordering.
  const value = parseInt(bitstring.replace(/[^01]/g, ""), 2);
  if (Number.isNaN(value)) {
    throw new Error("Unparseable IQM measurement.");
  }

  return {
    bytes: new Uint8Array([value & 0xff]),
    provenance: {
      label: BACKEND_LABEL,
      timestamp: new Date().toISOString(),
      reference: `job ${handle.uuid.slice(0, 8)}…`,
    },
  };
}
