import { MdGavel, MdPolicy } from "react-icons/md";
import SidebarNavGroup from "./SidebarNavGroup";
import SidebarNavItem from "./SidebarNavItem";

export default function SidebarGroupLegal({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <>
      <SidebarNavGroup label="Legal">
        <SidebarNavItem
          name="Privacy Policy"
          href="/legal/privacy"
          icon={MdPolicy}
          onNavigate={onNavigate}
        />
        <SidebarNavItem
          name="Terms of Use"
          href="/legal/terms-of-use"
          icon={MdGavel}
          onNavigate={onNavigate}
        />
      </SidebarNavGroup>
    </>
  );
}
