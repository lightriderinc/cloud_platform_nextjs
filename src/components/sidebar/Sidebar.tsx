import { getLogtoContext } from "@logto/next/server-actions";
import { logtoConfig } from "@/app/logto";
import ProfileCard from "../auth/ProfileCard";
import SidebarNav from "./SidebarNav";

// Persistent desktop sidebar. Hidden below the lg breakpoint, where the
// MobileMenu drawer takes over. Auth state is read server-side so the
// profile card only renders for signed-in users.
export default async function Sidebar() {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-gray-200 lg:flex">
      <SidebarNav />
      {isAuthenticated && (
        <ProfileCard
          username={claims?.username ?? claims?.name ?? "Account"}
          email={claims?.email ?? undefined}
        />
      )}
    </aside>
  );
}
