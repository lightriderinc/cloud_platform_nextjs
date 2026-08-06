import { handleSignIn } from "@/app/actions/auth";
import { MdAccountCircle, MdHistory, MdLocalOffer, MdPayments } from "react-icons/md";
import { RiLockPasswordFill } from "react-icons/ri";
import SidebarNavGroup from "./SidebarNavGroup";
import SidebarNavItem from "./SidebarNavItem";

export default function SidebarGroupSettings({
  onNavigate,
  isAuthenticated,
}: {
  onNavigate?: () => void;
  isAuthenticated: boolean;
}) {
  return (
    <>
      <SidebarNavGroup label="Settings">
        {isAuthenticated && (
          <>
            <SidebarNavItem
              name="Account"
              href="/settings/account"
              icon={MdAccountCircle}
              onNavigate={onNavigate}
            />
            <SidebarNavItem
              name="API Keys"
              href="/settings/keys"
              icon={RiLockPasswordFill}
              onNavigate={onNavigate}
            />
            
            {/* <SidebarNavItem
          name="Platform Settings"
          href="#"
          icon={MdSettings}
          onNavigate={onNavigate}
        /> */}
          </>
        )}


        {!isAuthenticated && (
          <>
            <p className="mt-3 text-sm text-gray-600 px-2">
              <button
                type="button"
                onClick={() => handleSignIn()}
                className="brand-link cursor-pointer"
              >
                Log in
              </button>{" "}
              to access account settings.
            </p>
          </>
        )}
      </SidebarNavGroup>

      {isAuthenticated && (
          <SidebarNavGroup label="Usage & Payment">
            <SidebarNavItem
              name="Usage"
              href="/settings/usage"
              icon={MdPayments}
              onNavigate={onNavigate}
            />
            <SidebarNavItem
              name="Purchases"
              href="/settings/purchases"
              icon={MdLocalOffer}
              onNavigate={onNavigate}
            />
            <SidebarNavItem
              name="Purchase History"
              href="/settings/purchase-history"
              icon={MdHistory}
              onNavigate={onNavigate}
            />
          </SidebarNavGroup>
        )}
    </>
  );
}
