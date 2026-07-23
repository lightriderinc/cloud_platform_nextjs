import SidebarNav from "./SidebarNav";

export default async function Sidebar() {

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-gray-100 lg:flex">
      <SidebarNav />
    </aside>
  );
}
