import { MdAccountCircle, MdPayments, MdSettings } from "react-icons/md";
import { RiLockPasswordFill } from "react-icons/ri";
import SidebarNavGroup from "./SidebarNavGroup";
import SidebarNavItem from "./SidebarNavItem";

export default function SidebarGroupSettings({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <>
      <SidebarNavGroup label="Settings">
        <SidebarNavItem
          name="Account"
          href="/settings/account"
          icon={MdAccountCircle}
          onNavigate={onNavigate}
        />
        <SidebarNavItem
          name="Access Tokens"
          href="#"
          icon={RiLockPasswordFill}
          onNavigate={onNavigate}
        />
        <SidebarNavItem
          name="Payment & Subscription"
          href="#"
          icon={MdPayments}
          onNavigate={onNavigate}
        />
        <SidebarNavItem
          name="Platform Settings"
          href="#"
          icon={MdSettings}
          onNavigate={onNavigate}
        />
      </SidebarNavGroup>
    </>
  );
}
