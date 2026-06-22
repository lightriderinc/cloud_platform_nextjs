"use client";

import { useState } from "react";
import { MdContentCopy, MdCheck, MdVisibility, MdVisibilityOff } from "react-icons/md";

function maskToken(token: string): string {
  const prefix = "lr_";
  if (!token.startsWith(prefix)) return "•".repeat(token.length);
  return prefix + "•".repeat(token.length - prefix.length);
}

export default function ApiTokenCard({ token }: { token: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <code className="min-w-0 flex-1 truncate rounded bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800">
          {token ? (revealed ? token : maskToken(token)) : "—"}
        </code>

        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          disabled={!token}
          aria-label={revealed ? "Hide token" : "Reveal token"}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          {revealed ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
          {revealed ? "Hide" : "Reveal"}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!token}
          aria-label="Copy token"
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          {copied ? (
            <MdCheck className="text-green-500" size={16} />
          ) : (
            <MdContentCopy size={16} />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
