// Account button shown in the header on desktop and at the bottom of the

import Link from "next/link";

type Props = {
  name: string;
  role?: string;
};

// mobile menu drawer.
export default function UserCard({ name, role }: Props) {
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <Link
        href="/settings/account"
        className="flex items-center gap-3 default-radius pl-2 pr-5 py-1.5 transition-colors hover:bg-gray-100"
      >
        <div className="relative w-8 h-8 default-radius overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-md font-semibold text-gray-400">
            {initials}
          </span>
        </div>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-gray-700">
            {name}
          </span>
          {role && (
            <span className="truncate text-xs text-gray-500">{role}</span>
          )}
        </span>
      </Link>
    </div>
  );
}
