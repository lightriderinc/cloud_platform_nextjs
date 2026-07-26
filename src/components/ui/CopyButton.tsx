"use client";

import { useState } from "react";
import { MdCheck, MdContentCopy } from "react-icons/md";

interface CopyButtonProps {
  /** Text written to the clipboard on click. */
  value: string;
  className?: string;
  /** Label shown beside the icon. Pass `null` for an icon-only button. */
  label?: string | null;
}

/**
 * Small reusable copy-to-clipboard button with a transient "Copied" state.
 * Matches the outlined button styling used across the dashboard.
 */
export default function CopyButton({
  value,
  className = "",
  label = "Copy",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — fail silently.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ?? (copied ? "Copied" : "Copy")}
      className={[
        "flex items-center gap-1.5 px-2.5 py-1 default-radius border border-gray-100 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors",
        className,
      ].join(" ")}
    >
      {copied ? <MdCheck className="text-green-700" /> : <MdContentCopy />}
      {label !== null && (copied ? "Copied" : label)}
    </button>
  );
}
