import { getSession } from "@/lib/auth/session";
import SidebarNav from "./SidebarNav";

export default async function Sidebar() {
  const { isAuthenticated } = await getSession();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-gray-100 lg:flex">
      <SidebarNav isAuthenticated={isAuthenticated} />
    </aside>
  );
}
