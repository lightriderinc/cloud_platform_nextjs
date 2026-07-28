"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdArrowOutward } from "react-icons/md";

export default function SidebarNavItem({
  name,
  href,
  icon,
  onNavigate,
  external,
  tourId,
}: {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  onNavigate?: () => void;
  external?: boolean;
  tourId?: string;
}) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <li data-tour={tourId}>
      <Link
        href={href}
        onClick={onNavigate}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={`mb-1 flex items-center gap-2 default-radius px-2 py-1.5 text-sm transition-colors ${
          active ? "bg-gray-100 font-medium" : "hover:bg-gray-50"
        }`}
      >
        {icon &&
          (() => {
            const Icon = icon;
            return (
              <Icon
                className={`text-gray-500 ${active ? "text-gray-700" : ""}`}
              />
            );
          })()}

        {name}
        {external && <MdArrowOutward />}
      </Link>
    </li>
  );
}
