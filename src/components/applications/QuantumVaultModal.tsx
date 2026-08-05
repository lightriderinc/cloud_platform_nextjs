"use client";

import { useState } from "react";
import {
  MdCheck,
  MdContentCopy,
  MdDownload,
  MdLock,
  MdLockOpen,
  MdVerified,
  MdCompareArrows,
  MdKey,
  MdWarning,
  MdClose,
  MdGavel,
  MdHourglassEmpty,
  MdShield,
} from "react-icons/md";
import EntropySourceSelector, { SOURCES } from "./EntropySourceSelector";
import ModalShell from "./ModalShell";
import {
  fetchEntropy,
  generateKemKeypair,
  generateSigningKeypair,
  encryptPayload,
  decryptPayload,
  buildEntropyCertificate,
  bytesToHex,
  hexToBytes,
  randomBytes,
  type VaultCapsule,
  type EntropyCertificate,
  type KemKeypair,
  type SigningKeypair,
} from "@/lib/pqc/quantumVault";

type Mode = "keys" | "encrypt" | "decrypt" | "compare";

interface Identity {
  kem: KemKeypair;
  dsa: SigningKeypair;
  certificate: EntropyCertificate;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function QuantumVaultModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("keys");
  const [showIntro, setShowIntro] = useState(true);

  // --- Identity (Keys tab) ---
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [keysBusy, setKeysBusy] = useState(false);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [downloadedSecret, setDownloadedSecret] = useState(false);
  const [copiedPub, setCopiedPub] = useState(false);

  // --- Encrypt tab ---
  const [recipientPubHex, setRecipientPubHex] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [signIt, setSignIt] = useState(true);
  const [encryptBusy, setEncryptBusy] = useState(false);
  const [encryptError, setEncryptError] = useState<string | null>(null);
  const [capsuleResult, setCapsuleResult] = useState<VaultCapsule | null>(null);
  const [copiedCapsule, setCopiedCapsule] = useState(false);

  // --- Decrypt tab ---
  const [mySecretHex, setMySecretHex] = useState("");
  const [capsuleInput, setCapsuleInput] = useState("");
  const [decryptResult, setDecryptResult] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // --- Compare tab ---
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareResult, setCompareResult] = useState<{
    quantum: EntropyCertificate;
    classical: EntropyCertificate;
  } | null>(null);

  const sourceData = SOURCES.find((s) => s.id === selectedSourceId);

  async function handleGenerateIdentity() {
    if (!sourceData) return;
    setKeysBusy(true);
    setKeysError(null);
    try {
      const { bytes: entropy, actualSourceId, jobId, verificationUrl } = await fetchEntropy(sourceData.id, 96);
      
      const kem = generateKemKeypair(entropy.slice(0, 64));
      const dsa = generateSigningKeypair(entropy.slice(64, 96));
      const certificate = buildEntropyCertificate(
        actualSourceId,
        actualSourceId === "csprng-fallback" ? "Local CSPRNG (fallback)" : sourceData.name,
        entropy,
        "ML-KEM-768",
        kem.publicKey,
        jobId,
        verificationUrl
      );
      setIdentity({ kem, dsa, certificate });
      setDownloadedSecret(false);
    } catch (e) {
      setKeysError(e instanceof Error ? e.message : "Key generation failed");
    } finally {
      setKeysBusy(false);
    }
  }

  function handleDownloadSecret() {
    if (!identity) return;
    downloadText(
      "quantum-vault-identity.secret.json",
      JSON.stringify(
        {
          warning: "Keep this file private. Anyone with it can decrypt messages sent to you.",
          kemSecretKey: bytesToHex(identity.kem.secretKey),
          dsaSecretKey: bytesToHex(identity.dsa.secretKey),
        },
        null,
        2
      )
    );
    setDownloadedSecret(true);
  }

  function handleCopyPublicKey() {
    if (!identity) return;
    navigator.clipboard.writeText(bytesToHex(identity.kem.publicKey));
    setCopiedPub(true);
    setTimeout(() => setCopiedPub(false), 2000);
  }

  async function handleEncrypt() {
    if (!plaintext.trim() || !recipientPubHex.trim()) return;
    setEncryptBusy(true);
    setEncryptError(null);
    try {
      const pub = hexToBytes(recipientPubHex.trim());
      const capsule = encryptPayload(
        pub,
        new TextEncoder().encode(plaintext),
        signIt && identity ? identity.dsa.secretKey : undefined,
        signIt && identity ? identity.dsa.publicKey : undefined
      );
      setCapsuleResult(capsule);
    } catch (e) {
      setEncryptError(
        e instanceof Error
          ? `${e.message} — check the recipient public key is valid hex from a Quantum Vault identity.`
          : "Encryption failed"
      );
    } finally {
      setEncryptBusy(false);
    }
  }

  function handleDecrypt() {
    setDecryptError(null);
    setDecryptResult(null);
    try {
      const secretKey = hexToBytes(mySecretHex.trim());
      const capsule: VaultCapsule = JSON.parse(capsuleInput);
      const plaintextBytes = decryptPayload(secretKey, capsule);
      setDecryptResult(new TextDecoder().decode(plaintextBytes));
    } catch (e) {
      setDecryptError(
        e instanceof Error ? e.message : "Could not decrypt — check the key and capsule are correct"
      );
    }
  }

  async function handleCompare() {
    setCompareBusy(true);
    try {
      const [{ bytes: qBytes, actualSourceId, jobId }, classicalBytes] = await Promise.all([
        fetchEntropy("lr-quantum-job", 64),
        Promise.resolve(randomBytes(64)),
      ]);
      const dummyKey = generateKemKeypair(qBytes).publicKey;
      const dummyKeyClassical = generateKemKeypair(classicalBytes).publicKey;

      const quantumSourceName =
        actualSourceId === "lr-quantum-job"
          ? "Real quantum job"
          : "Quantum backend unavailable — used local randomness instead";

      setCompareResult({
        quantum: buildEntropyCertificate(actualSourceId, quantumSourceName, qBytes, "ML-KEM-768", dummyKey, jobId),
        classical: buildEntropyCertificate(
          "browser-csprng",
          "Browser CSPRNG (crypto.getRandomValues)",
          classicalBytes,
          "ML-KEM-768",
          dummyKeyClassical
        ),
      });
    } finally {
      setCompareBusy(false);
    }
  }

  const TABS: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: "keys", label: "My Keys", icon: <MdKey /> },
    { id: "encrypt", label: "Encrypt", icon: <MdLock /> },
    { id: "decrypt", label: "Decrypt", icon: <MdLockOpen /> },
    { id: "compare", label: "Compare Sources", icon: <MdCompareArrows /> },
  ];

  return (
    <ModalShell title="Quantum Vault: Post-Quantum Encryption" onClose={onClose}>
      {showIntro && (
        <div className="default-radius border border-gray-100 bg-gray-50 p-4 mb-4 relative">
          <button
            type="button"
            onClick={() => setShowIntro(false)}
            aria-label="Dismiss explainer"
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <MdClose className="text-base" />
          </button>
          <p className="text-sm text-gray-700 pr-6 mb-3">
            Quantum-resistant encryption (ML-KEM). Generate a key, share it, receive secrets only you can open..
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-start gap-2 default-radius bg-white border border-gray-100 px-3 py-2">
              <MdGavel className="text-[var(--brand-primary)] text-lg mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-800">Compliance ready</p>
                <p className="text-xs text-gray-500">Meets PQC migration timelines</p>
              </div>
            </div>
            <div className="flex items-start gap-2 default-radius bg-white border border-gray-100 px-3 py-2">
              <MdShield className="text-[var(--brand-primary)] text-lg mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-800">Provable, not claimed</p>
                <p className="text-xs text-gray-500">Every key ships with a certificate</p>
              </div>
            </div>
            <div className="flex items-start gap-2 default-radius bg-white border border-gray-100 px-3 py-2">
              <MdHourglassEmpty className="text-[var(--brand-primary)] text-lg mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-800">Future-proof</p>
                <p className="text-xs text-gray-500">Safe even if quantum computers advance</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-100 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={[
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
              mode === t.id
                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "border-transparent text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="py-2 min-h-[340px] max-h-[60vh] overflow-y-auto">
        {/* ---------------- KEYS ---------------- */}
        {mode === "keys" && (
          <div className="space-y-4 animate-fade-in-up">
            {!identity && (
              <>
                <p className="text-sm text-gray-600">
                   Choose an entropy source, then generate your identity. Your secret key never leaves this device.
                </p>
                <EntropySourceSelector selectedId={selectedSourceId} onSelect={setSelectedSourceId} />
                <button
                  type="button"
                  disabled={!selectedSourceId || keysBusy}
                  onClick={handleGenerateIdentity}
                  style={{ backgroundColor: "var(--brand-primary)" }}
                  className="default-radius px-4 py-2 text-sm font-medium text-white transition-opacity cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {keysBusy ? "Generating…" : "Generate Identity"}
                </button>
                {keysError && (
                  <p className="text-sm text-red-600 default-radius bg-red-50 border border-red-100 px-3 py-2">
                    {keysError}
                  </p>
                )}
              </>
            )}

            {identity && (
              <>
                <div className="default-radius border border-green-100 bg-green-50 p-4 flex items-start gap-3">
                  <MdVerified className="text-green-700 text-xl mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Identity generated</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Source: {identity.certificate.sourceName}
                      {identity.certificate.quantumJobId && (
                        <> — job <span className="font-mono">{identity.certificate.quantumJobId.slice(0, 8)}…</span> (check the Jobs tab)</>
                      )}
                    </p>
                    {identity.certificate.verificationUrl && (
                      <a
                        href={identity.certificate.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        Verify this exact entropy independently →
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">Your public key (share this)</p>
                  <div className="default-radius border border-gray-100 bg-gray-50 p-3 flex items-center justify-between gap-2">
                    <p className="font-mono text-xs text-gray-600 break-all">
                      {bytesToHex(identity.kem.publicKey).slice(0, 48)}…
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyPublicKey}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 default-radius border border-gray-200 text-xs text-gray-600 hover:bg-white cursor-pointer"
                    >
                      {copiedPub ? <MdCheck className="text-green-700" /> : <MdContentCopy />}
                      {copiedPub ? "Copied" : "Copy full key"}
                    </button>
                  </div>
                </div>

                <div className="default-radius border border-amber-100 bg-amber-50 p-4 flex items-start gap-3">
                  <MdWarning className="text-amber-700 text-xl mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">
                      Your secret key is never displayed
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5 mb-2">
                      Only in this tab&apos;s memory — reload and it&apos;s gone. Download it now.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadSecret}
                      className="flex items-center gap-1.5 default-radius bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                    >
                      <MdDownload /> {downloadedSecret ? "Downloaded ✓ — download again" : "Download secret keyfile"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIdentity(null);
                    setSelectedSourceId(null);
                  }}
                  className="text-xs text-gray-500 underline cursor-pointer"
                >
                  Generate a different identity
                </button>
              </>
            )}
          </div>
        )}

        {/* ---------------- ENCRYPT ---------------- */}
        {mode === "encrypt" && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Recipient&apos;s public key
              </label>
              <div className="flex gap-2">
                <input
                  value={recipientPubHex}
                  onChange={(e) => setRecipientPubHex(e.target.value)}
                  placeholder="Paste a public key (hex)…"
                  className="default-radius flex-1 border border-gray-100 px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                {identity && (
                  <button
                    type="button"
                    onClick={() => setRecipientPubHex(bytesToHex(identity.kem.publicKey))}
                    className="shrink-0 default-radius border border-gray-100 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Use my own (self-test)
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Secret to protect</label>
              <textarea
                value={plaintext}
                onChange={(e) => setPlaintext(e.target.value)}
                placeholder="Paste an API key, credential, or any text…"
                rows={4}
                className="default-radius w-full border border-gray-100 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={signIt}
                onChange={(e) => setSignIt(e.target.checked)}
                disabled={!identity}
                className="h-4 w-4"
              />
              Sign with my identity (ML-DSA-65){!identity && ", generate an identity in My Keys first"}
            </label>

            <button
              type="button"
              disabled={!plaintext.trim() || !recipientPubHex.trim() || encryptBusy}
              onClick={handleEncrypt}
              style={{ backgroundColor: "var(--brand-primary)" }}
              className="flex items-center gap-1.5 default-radius px-4 py-2 text-sm font-medium text-white transition-opacity cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MdLock /> {encryptBusy ? "Encrypting…" : "Encrypt"}
            </button>

            {encryptError && (
              <p className="text-sm text-red-600 default-radius bg-red-50 border border-red-100 px-3 py-2">
                {encryptError}
              </p>
            )}

            {capsuleResult && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-700">Capsule — send this to the recipient</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(capsuleResult, null, 2));
                        setCopiedCapsule(true);
                        setTimeout(() => setCopiedCapsule(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 default-radius border border-gray-100 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                      {copiedCapsule ? <MdCheck className="text-green-700" /> : <MdContentCopy />}
                      {copiedCapsule ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadText("vault-capsule.qvault.json", JSON.stringify(capsuleResult, null, 2))
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 default-radius border border-gray-100 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                      <MdDownload /> Download
                    </button>
                  </div>
                </div>
                <div className="default-radius border border-gray-800 bg-gray-800 p-4 overflow-x-auto max-h-40 overflow-y-auto">
                  <pre className="font-mono text-xs text-green-300 whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(capsuleResult, null, 2)}
                  </pre>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  The capsule alone reveals nothing — only whoever holds the matching secret key
                  can open it. It&apos;s safe to send over email, Slack, or store publicly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------------- DECRYPT ---------------- */}
        {mode === "decrypt" && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your secret key (from your downloaded keyfile)
              </label>
              <textarea
                value={mySecretHex}
                onChange={(e) => setMySecretHex(e.target.value)}
                placeholder="Paste your kemSecretKey hex here…"
                rows={2}
                className="default-radius w-full border border-gray-100 px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Capsule to open</label>
              <textarea
                value={capsuleInput}
                onChange={(e) => setCapsuleInput(e.target.value)}
                placeholder="Paste the capsule JSON someone sent you…"
                rows={6}
                className="default-radius w-full border border-gray-100 px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
              />
            </div>
            <button
              type="button"
              disabled={!mySecretHex.trim() || !capsuleInput.trim()}
              onClick={handleDecrypt}
              style={{ backgroundColor: "var(--brand-primary)" }}
              className="flex items-center gap-1.5 default-radius px-4 py-2 text-sm font-medium text-white transition-opacity cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MdLockOpen /> Decrypt
            </button>

            {decryptError && (
              <p className="text-sm text-red-600 default-radius bg-red-50 border border-red-100 px-3 py-2">
                {decryptError}
              </p>
            )}
            {decryptResult !== null && (
              <div className="default-radius border border-green-100 bg-green-50 p-4">
                <p className="text-xs text-green-700 mb-1">Decrypted successfully:</p>
                <p className="font-mono text-sm text-green-900 break-all">{decryptResult}</p>
              </div>
            )}
          </div>
        )}

        {/* ---------------- COMPARE ---------------- */}
        {mode === "compare" && (
          <div className="space-y-4 animate-fade-in-up">
            <p className="text-sm text-gray-600">
              Real quantum backend vs. browser CSPRNG, side by side.
            </p>
            <button
              type="button"
              onClick={handleCompare}
              disabled={compareBusy}
              style={{ backgroundColor: "var(--brand-primary)" }}
              className="flex items-center gap-1.5 default-radius px-4 py-2 text-sm font-medium text-white transition-opacity cursor-pointer hover:opacity-80 disabled:opacity-40"
            >
              <MdCompareArrows /> {compareBusy ? "Fetching both…" : "Run Comparison"}
            </button>

            {compareResult && (
              <div className="space-y-3">
                {compareResult.quantum.sourceId !== "lr-quantum-job" && (
                  <p className="text-xs text-gray-500">
                    The quantum backend didn&apos;t answer this time, so both boxes below are showing local
                    randomness.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      label: "Quantum backend",
                      cert: compareResult.quantum,
                      tint:
                        compareResult.quantum.sourceId === "lr-quantum-job"
                          ? "border-[var(--brand-primary)]/25 bg-red-50"
                          : "border-gray-200 bg-gray-50",
                    },
                    { label: "Browser CSPRNG", cert: compareResult.classical, tint: "border-gray-200 bg-gray-50" },
                  ].map(({ label, cert, tint }) => (
                    <div key={label} className={`default-radius border p-4 ${tint}`}>
                      <p className="text-sm font-bold text-gray-800 mb-2">{label}</p>
                      <p className="text-xs text-gray-500 mb-0.5">Reported source</p>
                      <p className="text-sm font-medium text-gray-800 mb-2">{cert.sourceName}</p>
                      <p className="text-xs text-gray-500 mb-0.5">Digest</p>
                      <p className="font-mono text-xs text-gray-700 break-all mb-2">
                        {cert.entropyDigest.slice(0, 24)}…
                      </p>
                      {cert.quantumJobId ? (
                        <p className="text-xs text-green-700">
                          ✓ Verifiable — job <span className="font-mono">{cert.quantumJobId.slice(0, 8)}…</span> in your Jobs tab
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Algorithmic (computationally unpredictable, not physically)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}