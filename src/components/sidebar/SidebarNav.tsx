"use client";

import { usePathname } from "next/navigation";
import {
  MdArrowOutward
} from "react-icons/md";
import SidebarGroupDefault from "./SidebarGroupDefault";
import SidebarGroupLegal from "./SidebarGroupLegal";
import SidebarGroupSettings from "./SidebarGroupSettings";

// The navigation links + footer shared between the desktop sidebar and the
// mobile menu. onNavigate lets the mobile drawer close itself on link click.
export default function SidebarNav({
  onNavigate,
}: {
  onNavigate?: () => void;
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
          <SidebarGroupSettings onNavigate={onNavigate} />
        ) : (
          <SidebarGroupDefault onNavigate={onNavigate} />
        )}
      </nav>

      {/* Placeholder: docs/support links */}
      <div className="border-t border-gray-100 px-3 py-4 text-sm">
        <a
          href="https://lightriderinc.github.io/docs/"
          target="_blank"
          rel="noreferrer"
          className="mb-1 flex items-center gap-2 default-radius px-2 py-1.5 transition-colors hover:bg-gray-100"
        >
          Documentation <MdArrowOutward />
        </a>
        <a
          href="https://www.lightriderinc.com/"
          target="_blank"
          rel="noreferrer"
          className="mb-1 flex items-center gap-2 default-radius px-2 py-1.5 transition-colors hover:bg-gray-100"
        >
          Light Rider website <MdArrowOutward />
        </a>
        <a
          href="https://www.lightriderinc.com/contact"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 default-radius px-2 py-1.5 transition-colors hover:bg-gray-100"
        >
          contact <MdArrowOutward />
        </a>
      </div>
    </>
  );
}
