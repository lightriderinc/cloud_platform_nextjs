"use client";

import { useState } from "react";
import { MdCheck, MdContentCopy } from "react-icons/md";
import LRButton from "@/components/ui/LRButton";

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
    <LRButton
      type="button"
      onClick={handleCopy}
      aria-label={label ?? (copied ? "Copied" : "Copy")}
      variant="secondary-outline"
      icon={copied ? <MdCheck className="text-green-700" /> : <MdContentCopy />}
      iconPosition="left"
      className={className}
    >
      {label !== null && (copied ? "Copied" : label)}
    </LRButton>
  );
}
