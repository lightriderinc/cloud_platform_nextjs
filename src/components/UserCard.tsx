// Account button shown in the header on desktop and at the bottom of the

import Link from "next/link";
import { MdAccountCircle } from "react-icons/md";

type Props = {
  name: string;
  role?: string;
};

// mobile menu drawer.
export default function UserCard({ name, role }: Props) {
  return (
    <div>
      <Link
        href="/settings/account"
        className="flex items-center gap-2 default-radius pl-2 pr-5 py-1.5 transition-colors hover:bg-gray-100"
      >
        <MdAccountCircle className="h-8 w-8 shrink-0 text-gray-400" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-gray-700">
            {name}
          </span>
          {role && (
            <span className="truncate text-xs text-gray-500">{role} user</span>
          )}
        </span>
      </Link>
    </div>
  );
}
