"use client";

import { MdBarChart, MdDashboard } from "react-icons/md";
import { RiCpuFill } from "react-icons/ri";
import SidebarNavGroup from "./SidebarNavGroup";
import SidebarNavItem from "./SidebarNavItem";

// The navigation links + footer shared between the desktop sidebar and the
// mobile menu. onNavigate lets the mobile drawer close itself on link click.
export default function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
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
          href="#"
          className="mb-1 flex items-center gap-2 default-radius px-2 py-1.5 text-gray-400 transition-colors hover:bg-gray-100"
        >
          <span className="h-4 w-4 rounded-sm bg-gray-300" />
          Documentation
        </a>
        <a
          href="#"
          className="flex items-center gap-2 default-radius px-2 py-1.5 text-gray-400 transition-colors hover:bg-gray-100"
        >
          <span className="h-4 w-4 rounded-sm bg-gray-300" />
          Support
        </a>
      </div>
    </>
  );
}
