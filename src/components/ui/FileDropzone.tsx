"use client";

// Generic "drop a file here or click to browse" input. Domain-agnostic on
// purpose: it validates type/size and hands the caller a File, and knows
// nothing about what that file is for.

import { useRef, useState } from "react";
import { MdCloudUpload } from "react-icons/md";

type Props = {
  /** MIME types to accept, e.g. ["image/png", "image/jpeg"]. */
  accept: string[];
  /** Rejected above this size. Omit for no limit. */
  maxBytes?: number;
  onFile: (file: File) => void;
  /** Called with a user-facing message when a dropped/picked file is rejected. */
  onError?: (message: string) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

export default function FileDropzone({
  accept,
  maxBytes,
  onFile,
  onError,
  label = "Drop a file here, or click to browse",
  hint,
  disabled = false,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function validateAndEmit(file: File | undefined) {
    if (!file) return;

    if (accept.length > 0 && !accept.includes(file.type)) {
      onError?.("That file type isn't supported. Use a PNG, JPG, WEBP or GIF.");
      return;
    }
    if (maxBytes && file.size > maxBytes) {
      onError?.(`That file is too large. Keep it under ${formatBytes(maxBytes)}.`);
      return;
    }
    onFile(file);
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          validateAndEmit(e.dataTransfer.files?.[0]);
        }}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 default-radius border border-dashed px-6 py-10 text-center transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
          dragging
            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
            : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
        }`}
      >
        <MdCloudUpload
          className={`text-3xl ${dragging ? "color-brand-primary" : "text-gray-300"}`}
        />
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        className="hidden"
        onChange={(e) => {
          validateAndEmit(e.target.files?.[0]);
          // Reset so picking the same file twice in a row still fires onChange.
          e.target.value = "";
        }}
      />
    </div>
  );
}
