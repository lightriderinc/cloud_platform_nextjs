"use client";

import { MdFileDownload } from "react-icons/md";
import LRButton from "@/components/ui/LRButton";

interface DownloadButtonProps {
  /** File contents. */
  value: string;
  /** Filename, including extension. */
  filename: string;
  mimeType?: string;
  className?: string;
  /** Label shown beside the icon. Pass `null` for an icon-only button. */
  label?: string | null;
}

/** Small reusable "download as file" button — client-side Blob, no request. */
export default function DownloadButton({
  value,
  filename,
  mimeType = "text/plain",
  className = "",
  label = "Download",
}: DownloadButtonProps) {
  function handleDownload() {
    const blob = new Blob([value], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <LRButton
      type="button"
      onClick={handleDownload}
      aria-label={label ?? "Download"}
      variant="secondary-outline"
      icon={<MdFileDownload />}
      iconPosition="left"
      className={className}
    >
      {label}
    </LRButton>
  );
}
