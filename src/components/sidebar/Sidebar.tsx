"use client";

import { MdBarChart, MdDashboard } from "react-icons/md";
import { RiCpuFill } from "react-icons/ri";
import SidebarNavGroup from "./SidebarNavGroup";
import SidebarNavItem from "./SidebarNavItem";

export default function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200">
      <nav className="flex-1 px-3 py-4 overflow-auto">
        <SidebarNavGroup label="Compute">
          <SidebarNavItem name="Dashboard" href="/" icon={MdDashboard} />
          <SidebarNavItem name="Jobs" href="/jobs" icon={MdBarChart} />
          <SidebarNavItem name="Backends" href="/backends" icon={RiCpuFill} />
        </SidebarNavGroup>
      </nav>

      {/* Placeholder: docs/support links */}
      <div className="border-t border-gray-200 px-3 py-4 text-sm">
        <a
          href="#"
          className="mb-1 flex items-center gap-2 text-gray-400 default-radius px-2 py-1.5 hover:bg-gray-100"
        >
          <span className="h-4 w-4 rounded-sm bg-gray-300" />
          Documentation
        </a>
        <a
          href="#"
          className="flex items-center gap-2 text-gray-400 default-radius px-2 py-1.5 hover:bg-gray-100"
        >
          <span className="h-4 w-4 rounded-sm bg-gray-300" />
          Support
        </a>
      </div>
    </aside>
  );
}
