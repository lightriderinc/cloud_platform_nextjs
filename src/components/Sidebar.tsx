"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections: {
  label: string;
  items: { name: string; href: string }[];
}[] = [
  {
    label: "Compute",
    items: [
      { name: "Overview", href: "/" },
      { name: "Jobs", href: "/jobs" },
      { name: "Backends", href: "/backends" },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "API Tokens", href: "/tokens" },
      { name: "Billing & Usage", href: "/billing" },
      { name: "Settings", href: "/settings" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200">
      <nav className="flex-1 px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-gray-500">
              {section.label}
            </h3>
            <ul>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                        active ? "bg-gray-200 font-medium" : "hover:bg-gray-100"
                      }`}
                    >
                      {/* Placeholder icon */}
                      <span className="h-4 w-4 rounded-sm bg-gray-400" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Placeholder: docs/support links */}
      <div className="border-t border-gray-200 px-3 py-4 text-sm">
        <a
          href="#"
          className="mb-1 flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-100"
        >
          <span className="h-4 w-4 rounded-sm bg-gray-400" />
          Documentation
        </a>
        <a
          href="#"
          className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-100"
        >
          <span className="h-4 w-4 rounded-sm bg-gray-400" />
          Support
        </a>
      </div>
    </aside>
  );
}

