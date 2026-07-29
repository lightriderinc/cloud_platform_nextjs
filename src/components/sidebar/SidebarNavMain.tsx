"use client";

import { MdGavel, MdHelpCenter, MdSettings } from "react-icons/md";
import SidebarGroupDefault from "./SidebarGroupDefault";
import SidebarNavItem from "./SidebarNavItem";

// The navigation links + footer shared between the desktop sidebar and the
// mobile menu. onNavigate lets the mobile drawer close itself on link click.
export default function SidebarNavMain({
  onNavigate,
  isAuthenticated,
}: {
  onNavigate?: () => void;
  isAuthenticated: boolean;
}) {

  return (
    <>
      <nav className="flex-1 overflow-auto px-3 py-4">
        <SidebarGroupDefault
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
        />
      </nav>
      
      <div className="border-t border-gray-100 px-3 py-4">
        <ul>
          {isAuthenticated && (
            <SidebarNavItem
              name="Settings & Account"
              icon={MdSettings}
              href="/settings"
              onNavigate={onNavigate}
            />
          )}

          <SidebarNavItem
            name="Contact"
            icon={MdHelpCenter}
            href="https://www.lightriderinc.com/contact"
            external
            onNavigate={onNavigate}
          />
          <SidebarNavItem
            name="Legal"
            icon={MdGavel}
            href="/legal"
            onNavigate={onNavigate}
          />
        </ul>
      </div>
    </>
  );
}
