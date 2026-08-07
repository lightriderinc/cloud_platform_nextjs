"use client";

// The user's avatar rendered as an edit affordance: hovering (or focusing via
// the keyboard) reveals a camera overlay that opens EditAvatarModal.
//
// Kept separate from the modal so any page that shows an avatar can make it
// editable by swapping in this component, and so the account page can stay a
// server component.

import { useState } from "react";
import { MdPhotoCamera } from "react-icons/md";

import EditAvatarModal from "@/components/profile/EditAvatarModal";
import AvatarImage from "@/components/ui/AvatarImage";
import { getAvatarInitials } from "@/lib/avatar";

type Props = {
  /**
   * The user's own picture — an upload, or the one a social provider supplied.
   * Null when they've never set one. May also be a URL that no longer
   * resolves, which is why `fallbackSrc` exists.
   */
  src?: string | null;
  /** Placeholder when `src` is missing or won't load (the generated avatar). */
  fallbackSrc?: string | null;
  /** Used for alt text and to derive the initials fallback. */
  name: string;
  /** Rendered edge length in px. */
  size?: number;
  /** Largest accepted upload, in bytes. Passed through to the modal. */
  maxFileBytes?: number;
  /** See EditAvatarModal — omit while the storage backend is unbuilt. */
  onUploadAvatar?: (formData: FormData) => Promise<string>;
  onUpdateAvatarUrl?: (url: string) => Promise<void>;
  /** Clears the current avatar. Omit to hide the "Remove photo" action. */
  onRemoveAvatar?: () => Promise<void>;
  className?: string;
};

export default function ProfileAvatar({
  src,
  fallbackSrc,
  name,
  size = 64,
  maxFileBytes,
  onUploadAvatar,
  onUpdateAvatarUrl,
  onRemoveAvatar,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  /**
   * Local override so a save/removal shows immediately, before the server
   * re-render lands. Tri-state on purpose:
   *   undefined -> no local change yet, defer to the server-rendered `src`
   *   string    -> just set to this URL
   *   null      -> just removed; show the fallback
   */
  const [localSrc, setLocalSrc] = useState<string | null | undefined>(undefined);

  const shownSrc = localSrc !== undefined ? localSrc : (src ?? null);
  const initials = getAvatarInitials(name);
  // A removable avatar is any current custom picture — not the generated
  // fallback, which isn't passed as `src`.
  const canRemove = Boolean(shownSrc);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Change avatar"
        title="Change avatar"
        className={`group relative inline-flex flex-shrink-0 cursor-pointer overflow-hidden default-radius focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 ${
          className ?? ""
        }`}
      >
        <AvatarImage
          src={shownSrc}
          fallbackSrc={fallbackSrc}
          initials={initials}
          alt={`${name} avatar`}
          size={size}
        />
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-gray-900/60 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <MdPhotoCamera className="text-lg" />
          <span className="text-2xs font-medium tracking-wide uppercase">
            Change
          </span>
        </span>
      </button>

      {open && (
        <EditAvatarModal
          fallbackSrc={fallbackSrc}
          initials={initials}
          maxFileBytes={maxFileBytes}
          canRemove={canRemove}
          onUploadAvatar={onUploadAvatar}
          onUpdateAvatarUrl={onUpdateAvatarUrl}
          onRemoveAvatar={onRemoveAvatar}
          onSaved={setLocalSrc}
          onRemoved={() => setLocalSrc(null)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
