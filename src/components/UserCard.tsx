"use client";

// Account button shown in the header on desktop and at the bottom of the
// mobile menu drawer. On desktop it opens a dropdown with the settings nav
// group and a log out button; in the mobile menu it stays a plain link since
// the drawer already surfaces settings navigation of its own.

import { getAvatarInitials } from "@/lib/avatar";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "./auth/LogoutButton";
import SidebarGroupSettings from "./sidebar/SidebarGroupSettings";
import AvatarImage from "./ui/AvatarImage";

type Props = {
  name: string;
  role?: string;
  /**
   * The user's own picture. Null when unset — this component does NOT generate
   * a fallback itself; the caller resolves both sources via
   * `resolveAvatarSources` so the header and the account page always agree.
   */
  avatarUrl?: string | null;
  /** Generated placeholder used when `avatarUrl` is missing or won't load. */
  fallbackAvatarUrl?: string | null;
  dropdown?: boolean;
  onSignOut?: () => Promise<void>;
};

export default function UserCard({
  name,
  role,
  avatarUrl,
  fallbackAvatarUrl,
  dropdown = false,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const avatar = (
    <AvatarImage
      src={avatarUrl}
      fallbackSrc={fallbackAvatarUrl}
      initials={getAvatarInitials(name)}
      // Decorative: the user's name is rendered right beside it.
      alt=""
      size={32}
      className="flex-shrink-0"
    />
  );

  const label = (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium text-gray-700">{name}</span>
      {role && <span className="truncate text-xs text-gray-500">{role}</span>}
    </span>
  );

  if (!dropdown) {
    return (
      <div>
        <Link
          href="/settings/account"
          className="flex items-center gap-3 default-radius pl-2 pr-5 py-1.5 transition-colors hover:bg-gray-100 cursor-pointer"
        >
          {avatar}
          {label}
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 default-radius pl-2 pr-5 py-1.5 transition-colors hover:bg-gray-100 cursor-pointer"
      >
        {avatar}
        {label}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 default-radius border border-gray-100 bg-white p-3 shadow-lg"
        >
          <SidebarGroupSettings
            onNavigate={() => setOpen(false)}
            isAuthenticated
          />
          {onSignOut && (
            <div className="border-t border-gray-100 pt-3">
              <LogoutButton
                onSignOut={async () => {
                  setOpen(false);
                  await onSignOut();
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
