import Link from "next/link";
import { MdAccountCircle } from "react-icons/md";

type Props = {
  username: string;
  email?: string;
};

// Signed-in user card at the bottom of the sidebar, below the footer links.
// Links to the profile page. Purely presentational - auth state and claims
// are resolved server-side by the Sidebar and passed in as props.
export default function ProfileCard({ username, email }: Props) {
  return (
    <div className="border-t border-gray-200 px-3 py-3">
      <Link
        href="/profile"
        className="flex items-center gap-2 default-radius px-2 py-1.5 transition-colors hover:bg-gray-100"
      >
        <MdAccountCircle className="h-8 w-8 shrink-0 text-gray-400" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-gray-700">
            {username}
          </span>
          {email && (
            <span className="truncate text-xs text-gray-500">{email}</span>
          )}
        </span>
      </Link>
    </div>
  );
}
