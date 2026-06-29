import SidebarNav from "./SidebarNav";

// Persistent desktop sidebar. Hidden below the lg breakpoint, where the
// MobileMenu drawer takes over.
export default function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-gray-200 lg:flex">
      <SidebarNav />
    </aside>
  );
}
