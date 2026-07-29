"use client";

import { useState } from "react";
import { MdCheck, MdContentCopy, MdVisibility, MdVisibilityOff } from "react-icons/md";
import LRButton from "@/components/ui/LRButton";

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
    <div className="default-radius border border-gray-100 p-2">
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate  bg-white px-3 py-2 font-mono text-sm text-gray-800">
          {token ? (revealed ? token : maskToken(token)) : "—"}
        </code>
        <div className="flex gap-1">
          <LRButton
            type="button"
            onClick={() => setRevealed((v) => !v)}
            disabled={!token}
            aria-label={revealed ? "Hide token" : "Reveal token"}
            variant="secondary"
            icon={revealed ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
            iconPosition="left"
            className="shrink-0"
          >
            {revealed ? "Hide" : "Reveal"}
          </LRButton>

          <LRButton
            type="button"
            onClick={handleCopy}
            disabled={!token}
            aria-label="Copy token"
            variant="secondary"
            icon={copied ? <MdCheck className="text-green-500" size={16} /> : <MdContentCopy size={16} />}
            iconPosition="left"
            className="shrink-0"
          >
            {copied ? "Copied" : "Copy"}
          </LRButton>
        </div>
      </div>
    </div>
  );
}
