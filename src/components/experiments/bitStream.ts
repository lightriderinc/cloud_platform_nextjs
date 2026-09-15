// Client-side helpers for handling withdrawn/measured bit streams. Streams
// only ever travel as base64 and are decoded to raw bytes here -- never
// rendered as a bit-by-bit string in the DOM (a large withdrawal would
// freeze the page); callers show a truncated hex preview only.

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToHexPreview(bytes: Uint8Array, maxBytes = 64): string {
  const slice = bytes.subarray(0, maxBytes);
  const hex = Array.from(slice, (b) => b.toString(16).padStart(2, "0")).join(" ");
  return bytes.length > maxBytes ? `${hex} …` : hex;
}

export function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyFullHex(bytes: Uint8Array): Promise<void> {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  await navigator.clipboard.writeText(hex);
}
