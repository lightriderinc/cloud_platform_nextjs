"use client";

import { usePathname } from "next/navigation";
import SidebarGroupLegal from "./SidebarGroupLegal";
import SidebarGroupSettings from "./SidebarGroupSettings";

// The navigation links + footer shared between the desktop sidebar and the
// mobile menu. onNavigate lets the mobile drawer close itself on link click.
export default function SidebarNav({
  onNavigate,
  isAuthenticated,
}: {
  onNavigate?: () => void;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();

  const isLegalRoute = pathname?.startsWith("/legal");
  const isSettingsRoute = pathname?.startsWith("/settings");

  return (
    <>
      <nav className="flex-1 overflow-auto px-3 py-4">
        {isLegalRoute ? (
          <SidebarGroupLegal onNavigate={onNavigate} />
        ) : isSettingsRoute ? (
          <SidebarGroupSettings
            onNavigate={onNavigate}
            isAuthenticated={isAuthenticated}
          />
        ): (<></>)}
      </nav>
    </>
  );
}
