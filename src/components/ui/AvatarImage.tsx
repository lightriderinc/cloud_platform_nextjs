"use client";

// Square avatar image that degrades instead of breaking.
//
// Tries `src` first (a user's uploaded/social picture), falls back to
// `fallbackSrc` (normally the generated pixelbot avatar), and finally renders
// initials if neither loads. That last step matters because `src` is often a
// third-party URL — a social provider's CDN, or an address the user pasted —
// which can 403, expire, or simply be wrong, and a bare <img> would show the
// browser's broken-image glyph plus the alt text.

import { useEffect, useState } from "react";

type Props = {
  /** Preferred image. Null/empty skips straight to `fallbackSrc`. */
  src?: string | null;
  /** Shown when `src` is absent or fails to load. */
  fallbackSrc?: string | null;
  /** Last resort when no candidate loads. */
  initials: string;
  alt: string;
  /** Rendered edge length in px. */
  size: number;
  className?: string;
};

export default function AvatarImage({
  src,
  fallbackSrc,
  initials,
  alt,
  size,
  className,
}: Props) {
  const candidates = [src, fallbackSrc].filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );

  // Index of the candidate currently being attempted; incremented on each
  // load failure until we run out and show initials.
  const [attempt, setAttempt] = useState(0);

  // A new src (e.g. right after a save) deserves a fresh set of attempts.
  useEffect(() => {
    setAttempt(0);
  }, [src, fallbackSrc]);

  const current = candidates[attempt];

  return (
    <span
      className={`relative flex items-center justify-center overflow-hidden default-radius border border-gray-200 bg-gray-100 ${
        className ?? ""
      }`}
      style={{ width: size, height: size }}
    >
      {current ? (
        // Plain <img>, not next/image: the source is user-supplied at runtime
        // (arbitrary host, data URI, or a local blob preview).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current}
          src={current}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setAttempt((n) => n + 1)}
        />
      ) : (
        <span
          className="font-semibold text-gray-300 select-none"
          style={{ fontSize: Math.max(11, Math.round(size * 0.36)) }}
          aria-label={alt}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
