"use client";

import { useState } from "react";
import { MdEdit, MdVerified, MdCancel, MdContentCopy, MdCheck } from "react-icons/md";
import ModalShell from "./ModalShell";
import {
  generateSigningKeypair,
  signData,
  verifySignature,
  bytesToHex,
  hexToBytes,
  randomBytes,
} from "@/lib/pqc/quantumVault";

type Mode = "sign" | "verify";

// Bundles the public key + signature into one shareable token so users only
// ever have to copy/paste a single value instead of juggling two hex blobs.
const BUNDLE_DELIMITER = ".";

function encodeBundle(publicKeyHex: string, signatureHex: string) {
  return `${publicKeyHex}${BUNDLE_DELIMITER}${signatureHex}`;
}

function decodeBundle(bundle: string): { publicKeyHex: string; signatureHex: string } {
  const parts = bundle.trim().split(BUNDLE_DELIMITER);
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("That doesn't look like a valid signature — paste the full value you copied after signing");
  }
  return { publicKeyHex: parts[0], signatureHex: parts[1] };
}

const COLLAPSED_PREVIEW_LENGTH = 80;

export default function QuantumSignerModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("sign");

  const [signText, setSignText] = useState("");
  const [signResult, setSignResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [verifyText, setVerifyText] = useState("");
  const [verifyBundle, setVerifyBundle] = useState("");
  const [verifyOutcome, setVerifyOutcome] = useState<boolean | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  function handleSign() {
    if (!signText.trim()) return;
    const keypair = generateSigningKeypair(randomBytes(32));
    const signature = signData(keypair.secretKey, new TextEncoder().encode(signText));
    setSignResult(encodeBundle(bytesToHex(keypair.publicKey), bytesToHex(signature)));
    setExpanded(false);
  }

  function handleVerify() {
    setVerifyError(null);
    setVerifyOutcome(null);
    try {
      const { publicKeyHex, signatureHex } = decodeBundle(verifyBundle);
      const valid = verifySignature(
        hexToBytes(publicKeyHex),
        new TextEncoder().encode(verifyText),
        hexToBytes(signatureHex)
      );
      setVerifyOutcome(valid);
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Could not verify — check the inputs are valid");
    }
  }

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ModalShell title="Quantum-Safe Signer — ML-DSA-65" onClose={onClose}>
      <div className="flex gap-1 border-b border-gray-100 mb-4">
        {(["sign", "verify"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer capitalize",
              mode === m ? "border-[var(--brand-primary)] text-[var(--brand-primary)]" : "border-transparent text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="py-2 min-h-[300px]">
        {mode === "sign" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sign any text with ML-DSA-65, the quantum-resistant signature standard. You&apos;ll get
              back a single signature to share alongside the text, anyone can use it to confirm
              the text wasn&apos;t altered.
            </p>
            <textarea
              value={signText}
              onChange={(e) => setSignText(e.target.value)}
              placeholder="Paste the text or document contents to sign…"
              rows={5}
              className="default-radius w-full border border-gray-100 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
            />
            <button
              type="button"
              onClick={handleSign}
              disabled={!signText.trim()}
              style={{ backgroundColor: "var(--brand-primary)" }}
              className="flex items-center gap-1.5 default-radius px-4 py-2 text-sm font-medium text-white hover:opacity-80 cursor-pointer disabled:opacity-40"
            >
              <MdEdit /> Sign
            </button>

            {signResult && (
              <div className="default-radius border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">Signature (share this alongside the text)</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(signResult)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {copied ? <MdCheck className="text-green-700" /> : <MdContentCopy />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="font-mono text-xs text-gray-700 break-all">
                  {expanded || signResult.length <= COLLAPSED_PREVIEW_LENGTH
                    ? signResult
                    : `${signResult.slice(0, COLLAPSED_PREVIEW_LENGTH)}…`}
                </p>
                {signResult.length > COLLAPSED_PREVIEW_LENGTH && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-1 text-xs font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {expanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "verify" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-2">
              Paste the original text and the signature, this checks authenticity entirely in
              your browser.
            </p>
            <textarea
              value={verifyText}
              onChange={(e) => setVerifyText(e.target.value)}
              placeholder="Paste the original text exactly as it was signed…"
              rows={4}
              className="default-radius w-full border border-gray-100 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
            />
            <textarea
              value={verifyBundle}
              onChange={(e) => setVerifyBundle(e.target.value)}
              placeholder="Paste the signature…"
              rows={3}
              className="default-radius w-full border border-gray-100 px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={!verifyText.trim() || !verifyBundle.trim()}
              style={{ backgroundColor: "var(--brand-primary)" }}
              className="flex items-center gap-1.5 default-radius px-4 py-2 text-sm font-medium text-white hover:opacity-80 cursor-pointer disabled:opacity-40"
            >
              Verify
            </button>

            {verifyError && (
              <p className="text-sm text-red-600 default-radius bg-red-50 border border-red-100 px-3 py-2">
                {verifyError}
              </p>
            )}
            {verifyOutcome !== null && (
              <div
                className={`default-radius border p-4 flex items-center gap-3 ${
                  verifyOutcome ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"
                }`}
              >
                {verifyOutcome ? (
                  <>
                    <MdVerified className="text-green-700 text-xl" />
                    <p className="text-sm font-semibold text-green-800">Signature valid, text is authentic and unaltered</p>
                  </>
                ) : (
                  <>
                    <MdCancel className="text-red-700 text-xl" />
                    <p className="text-sm font-semibold text-red-800">Signature invalid, text was altered or doesn&apos;t match</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
