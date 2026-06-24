import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarNavItem({
  name,
  href,
  icon,
}: {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <li>
      <Link
        href={href}
        className={`mb-1 flex items-center gap-2 default-radius px-2 py-1.5 text-sm ${
          active ? "bg-gray-200 font-medium" : "hover:bg-gray-100"
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
      </Link>
    </li>
  );
}
