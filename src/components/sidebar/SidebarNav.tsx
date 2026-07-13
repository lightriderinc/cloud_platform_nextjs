"use client";

import { usePathname } from "next/navigation";
import {
  MdApps,
  MdArrowOutward,
  MdBarChart,
  MdDashboard, // Added for legal
  MdGavel,
  MdPolicy, // Added for legal
} from "react-icons/md";
import { RiCpuFill } from "react-icons/ri";
import SidebarNavGroup from "./SidebarNavGroup";
import SidebarNavItem from "./SidebarNavItem";

// The navigation links + footer shared between the desktop sidebar and the
// mobile menu. onNavigate lets the mobile drawer close itself on link click.
export default function SidebarNav({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isLegalRoute = pathname?.startsWith("/legal");

  return (
    <>
      <nav className="flex-1 overflow-auto px-3 py-4">
        {isLegalRoute ? (
          /* --- LEGAL NAVIGATION --- */
          <SidebarNavGroup label="Legal">
            <SidebarNavItem
              name="Privacy Policy"
              href="/legal/privacy"
              icon={MdPolicy}
              onNavigate={onNavigate}
            />
            <SidebarNavItem
              name="Terms of Use"
              href="/legal/terms-of-use"
              icon={MdGavel}
              onNavigate={onNavigate}
            />
          </SidebarNavGroup>
        ) : (
          /* --- DEFAULT NAVIGATION --- */
          <>
            <SidebarNavGroup label="Compute">
              <SidebarNavItem
                name="Dashboard"
                href="/"
                icon={MdDashboard}
                onNavigate={onNavigate}
              />
              <SidebarNavItem
                name="Jobs"
                href="/jobs"
                icon={MdBarChart}
                onNavigate={onNavigate}
              />
            </SidebarNavGroup>

            <SidebarNavGroup label="Explore">
              <SidebarNavItem
                name="Applications"
                href="/applications"
                icon={MdApps}
                onNavigate={onNavigate}
              />
              <SidebarNavItem
                name="Backends"
                href="/backends"
                icon={RiCpuFill}
                onNavigate={onNavigate}
              />
            </SidebarNavGroup>
          </>
        )}
      </nav>

      {/* Placeholder: docs/support links */}
      <div className="border-t border-gray-200 px-3 py-4 text-sm">
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
