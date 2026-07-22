// Client-side entropy generation for the cloud platform demo.
//
// NOTE: This is the "dumbed down" customer-facing demo. Entropy is generated in
// the browser via the Web Crypto API so the page works with no backend. When
// the EMS-backed distribution service is ready, swap the body of
// `requestEntropy` for a fetch to the entropy egress endpoint and keep the same
// return shape — callers (EntropyConsole, history, output) won't need to change.

export const BYTE_PRESETS = [16, 32, 64, 128, 256, 512];
export const MIN_BYTES = 1;
export const MAX_BYTES = 4096;

export type OutputFormat = "hex";

export interface EntropyResult {
  /** Stable id for React keys + history entries. */
  id: string;
  sourceId: string;
  sourceName: string;
  bytes: number;
  format: OutputFormat;
  /** The generated entropy, encoded per `format`. */
  value: string;
  /** Epoch milliseconds the entropy was produced. */
  createdAt: number;
}

export interface EntropyRequest {
  sourceId: string;
  sourceName: string;
  bytes: number;
}

/** Returns `bytes` bytes of CSPRNG output as a lowercase hex string. */
export function generateHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isValidByteCount(bytes: number): boolean {
  return Number.isInteger(bytes) && bytes >= MIN_BYTES && bytes <= MAX_BYTES;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Produce entropy for a request. Async on purpose so that swapping in a real
 * network-backed source later is a drop-in change.
 */
export async function requestEntropy({
  sourceId,
  sourceName,
  bytes,
}: EntropyRequest): Promise<EntropyResult> {
  // --- Demo generation (client-side). Replace with a real API call later. ---
  const value = generateHex(bytes);

  return {
    id: newId(),
    sourceId,
    sourceName,
    bytes,
    format: "hex",
    value,
    createdAt: Date.now(),
  };
}
