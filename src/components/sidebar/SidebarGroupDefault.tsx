import { MdApps, MdBarChart, MdDashboard, MdPayments } from "react-icons/md";
import { RiCpuFill } from "react-icons/ri";
import SidebarNavGroup from "./SidebarNavGroup";
import SidebarNavItem from "./SidebarNavItem";

export default function SidebarGroupDefault({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <>
      <SidebarNavGroup label="Compute">
        <SidebarNavItem
          name="Dashboard"
          href="/"
          icon={MdDashboard}
          onNavigate={onNavigate}
        />
        <SidebarNavItem
          name="Jobs"
          href="/jobs"
          icon={MdBarChart}
          onNavigate={onNavigate}
        />
      </SidebarNavGroup>

      <SidebarNavGroup label="Explore">
        <SidebarNavItem
          name="Applications"
          href="/applications"
          icon={MdApps}
          onNavigate={onNavigate}
        />
        <SidebarNavItem
          name="Backends"
          href="/backends"
          icon={RiCpuFill}
          onNavigate={onNavigate}
        />
      </SidebarNavGroup>

      <SidebarNavGroup label="Platform">
        <SidebarNavItem
          name="Pricing"
          href="/pricing"
          icon={MdPayments}
          onNavigate={onNavigate}
        />
      </SidebarNavGroup>
    </>
  );
}
