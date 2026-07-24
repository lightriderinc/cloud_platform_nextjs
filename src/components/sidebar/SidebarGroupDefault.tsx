import { MdApps, MdBarChart, MdDashboard } from "react-icons/md";
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
          tourId="sidebar-dashboard"
        />
        <SidebarNavItem
          name="Jobs"
          href="/jobs"
          icon={MdBarChart}
          onNavigate={onNavigate}
          tourId="sidebar-jobs"
        />
      </SidebarNavGroup>

      {/* <SidebarNavGroup label="Entropy">
        <SidebarNavItem
          name="Get Entropy"
          href="/entropy"
          icon={MdCasino}
          onNavigate={onNavigate}
          tourId="sidebar-entropy"
        />
      </SidebarNavGroup> */}

      <SidebarNavGroup label="Explore">
        <SidebarNavItem
          name="Applications"
          href="/applications"
          icon={MdApps}
          onNavigate={onNavigate}
          tourId="sidebar-applications"
        />
        <SidebarNavItem
          name="Backends"
          href="/backends"
          icon={RiCpuFill}
          onNavigate={onNavigate}
          tourId="sidebar-backends"
        />
      </SidebarNavGroup>

      {/* <SidebarNavGroup label="Platform">
        <SidebarNavItem
          name="Pricing"
          href="/pricing"
          icon={MdPayments}
          onNavigate={onNavigate}
          tourId="sidebar-pricing"
        />
      </SidebarNavGroup> */}
    </>
  );
}
