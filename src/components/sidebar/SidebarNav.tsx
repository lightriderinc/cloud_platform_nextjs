"use client";

import { MdArrowOutward, MdBarChart, MdDashboard } from "react-icons/md";
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
  return (
    <>
      <nav className="flex-1 overflow-auto px-3 py-4">
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
          <SidebarNavItem
            name="Backends"
            href="/backends"
            icon={RiCpuFill}
            onNavigate={onNavigate}
          />
        </SidebarNavGroup>
      </nav>

      {/* Placeholder: docs/support links */}
      <div className="border-t border-gray-200 px-3 py-4 text-sm">
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
