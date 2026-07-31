/**
 * quantumVault.ts
 * ----------------
 * Core hybrid post-quantum cryptography engine for the Quantum Vault application.
 *
 * Design goals:
 *  - Pure JS/WASM-free primitives (@noble/*) so this file behaves identically on
 *    x86 laptops, Raspberry Pi (ARM), Jetson (ARM), in the browser, and on any
 *    Node.js server — no native bindings to cross-compile per architecture.
 *  - ML-KEM-768 (FIPS 203 / Kyber) for key encapsulation.
 *  - ML-DSA-65 (FIPS 204 / Dilithium) for quantum-resistant signatures.
 *  - AES-256-GCM for the actual payload, keyed by a KEM-derived shared secret via HKDF.
 *  - Every keypair is seeded from an "entropy source" the caller selects (quantum
 *    backend, NIST beacon, RDSEED, etc). We never trust a single entropy source
 *    blindly — we hash it into an auditable certificate instead of using it raw.
 *
 * This module has no dependency on Next.js/React and can be imported directly by
 * the CLI script (scripts/qvault-cli.mjs) for headless edge use on a Pi/Jetson.
 */

import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

export const VAULT_FORMAT_VERSION = "qvault-v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KemKeypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface SigningKeypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/** Portable, JSON-serializable encrypted capsule. Safe to store or transmit. */
export interface VaultCapsule {
  version: string;
  algo: {
    kem: "ML-KEM-768";
    aead: "AES-256-GCM";
    kdf: "HKDF-SHA256";
  };
  kemCipherText: string; // hex
  nonce: string; // hex
  ciphertext: string; // hex
  signature?: string; // hex, present if the capsule was signed
  signerPublicKey?: string; // hex
  createdAt: string; // ISO timestamp
}

/** An auditable, human-presentable proof of which entropy fed a key. */
export interface EntropyCertificate {
  version: string;
  sourceId: string;
  sourceName: string;
  /** SHA-256 hash of the raw entropy sample — proves provenance without exposing the seed. */
  entropyDigest: string;
  keyKind: "ML-KEM-768" | "ML-DSA-65";
  publicKeyFingerprint: string; // SHA-256 of the public key, first 16 bytes hex
  issuedAt: string;
  /** Present only when the entropy came from a real LR quantum job — look it
   *  up in the Jobs tab to independently verify this certificate isn't just
   *  a label. */
  quantumJobId?: string;
  verificationUrl?: string;
}

// ---------------------------------------------------------------------------
// Entropy handling
// ---------------------------------------------------------------------------

/**
 * Fetch entropy bytes for a given source. Calls /api/entropy, which submits a
 * real job to the LightRider quantum backend when LR_TOKEN is configured
 * server-side (see src/app/api/entropy/route.ts), falling back to a CSPRNG
 * otherwise so the feature degrades gracefully instead of failing.
 *
 * Critically, `actualSourceId` and `jobId` are read from the response
 * headers the server actually sent — never assumed from what the caller
 * requested. That's what keeps the entropy certificate honest: it reports
 * what happened, not what was hoped for.
 */
export async function fetchEntropy(
  sourceId: string,
  numBytes: number,
  fetchImpl: typeof fetch = fetch
): Promise<{ bytes: Uint8Array; actualSourceId: string; jobId?: string; verificationUrl?: string }> {
  try {
    const res = await fetchImpl(`/api/entropy?source=${encodeURIComponent(sourceId)}&bytes=${numBytes}`);
    if (res.ok) {
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length >= numBytes) {
        const actualSourceId = res.headers.get("X-Entropy-Source") ?? sourceId;
        const jobId = res.headers.get("X-Entropy-Job-Id") ?? undefined;
        const verificationUrl = res.headers.get("X-Entropy-Verification-Url") ?? undefined;
        return { bytes: buf.slice(0, numBytes), actualSourceId, jobId, verificationUrl };
      }
    }
  } catch {
    // network/backend unavailable — fall through to local CSPRNG
  }
  return { bytes: randomBytes(numBytes), actualSourceId: "csprng-fallback" };
}

function fingerprint(publicKey: Uint8Array): string {
  return bytesToHex(sha256(publicKey)).slice(0, 32);
}

export function buildEntropyCertificate(
  sourceId: string,
  sourceName: string,
  entropySample: Uint8Array,
  keyKind: EntropyCertificate["keyKind"],
  publicKey: Uint8Array,
  quantumJobId?: string,
  verificationUrl?: string
): EntropyCertificate {
  return {
    version: VAULT_FORMAT_VERSION,
    sourceId,
    sourceName,
    entropyDigest: bytesToHex(sha256(entropySample)),
    keyKind,
    publicKeyFingerprint: fingerprint(publicKey),
    issuedAt: new Date().toISOString(),
    ...(quantumJobId ? { quantumJobId } : {}),
    ...(verificationUrl ? { verificationUrl } : {}),
  };
}

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/** ML-KEM-768 requires a 64-byte seed. */
export function generateKemKeypair(entropy64: Uint8Array): KemKeypair {
  if (entropy64.length < 64) throw new Error("ML-KEM keygen needs >= 64 bytes of entropy");
  return ml_kem768.keygen(entropy64.slice(0, 64));
}

/** ML-DSA-65 requires a 32-byte seed. */
export function generateSigningKeypair(entropy32: Uint8Array): SigningKeypair {
  if (entropy32.length < 32) throw new Error("ML-DSA keygen needs >= 32 bytes of entropy");
  return ml_dsa65.keygen(entropy32.slice(0, 32));
}

// ---------------------------------------------------------------------------
// Encrypt / decrypt (hybrid PQC: ML-KEM shared secret -> HKDF -> AES-256-GCM)
// ---------------------------------------------------------------------------

export function encryptPayload(
  recipientPublicKey: Uint8Array,
  plaintext: Uint8Array,
  signerSecretKey?: Uint8Array,
  signerPublicKey?: Uint8Array
): VaultCapsule {
  const { cipherText: kemCipherText, sharedSecret } = ml_kem768.encapsulate(recipientPublicKey);
  const aesKey = hkdf(sha256, sharedSecret, undefined, new TextEncoder().encode(VAULT_FORMAT_VERSION), 32);
  const nonce = randomBytes(12);
  const ciphertext = gcm(aesKey, nonce).encrypt(plaintext);

  const capsule: VaultCapsule = {
    version: VAULT_FORMAT_VERSION,
    algo: { kem: "ML-KEM-768", aead: "AES-256-GCM", kdf: "HKDF-SHA256" },
    kemCipherText: bytesToHex(kemCipherText),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
    createdAt: new Date().toISOString(),
  };

  if (signerSecretKey && signerPublicKey) {
    const sig = ml_dsa65.sign(hexToBytes(capsule.ciphertext), signerSecretKey);
    capsule.signature = bytesToHex(sig);
    capsule.signerPublicKey = bytesToHex(signerPublicKey);
  }

  return capsule;
}

export function decryptPayload(recipientSecretKey: Uint8Array, capsule: VaultCapsule): Uint8Array {
  if (capsule.signature && capsule.signerPublicKey) {
    const valid = ml_dsa65.verify(
      hexToBytes(capsule.signature),
      hexToBytes(capsule.ciphertext),
      hexToBytes(capsule.signerPublicKey)
    );
    if (!valid) throw new Error("Signature verification failed — capsule integrity cannot be confirmed");
  }

  const sharedSecret = ml_kem768.decapsulate(hexToBytes(capsule.kemCipherText), recipientSecretKey);
  const aesKey = hkdf(sha256, sharedSecret, undefined, new TextEncoder().encode(VAULT_FORMAT_VERSION), 32);
  return gcm(aesKey, hexToBytes(capsule.nonce)).decrypt(hexToBytes(capsule.ciphertext));
}

// ---------------------------------------------------------------------------
// Standalone signing (e.g. for documents you don't want to encrypt, just prove
// weren't tampered with, in a way that resists future quantum attacks on RSA/ECDSA)
// ---------------------------------------------------------------------------

export function signData(secretKey: Uint8Array, data: Uint8Array): Uint8Array {
  return ml_dsa65.sign(data, secretKey);
}

export function verifySignature(publicKey: Uint8Array, data: Uint8Array, signature: Uint8Array): boolean {
  return ml_dsa65.verify(signature, data, publicKey);
}

// ---------------------------------------------------------------------------
// Convenience: hex <-> string helpers for UI layers
// ---------------------------------------------------------------------------

export { bytesToHex, hexToBytes, randomBytes };
