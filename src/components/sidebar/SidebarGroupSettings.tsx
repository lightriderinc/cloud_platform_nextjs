import { handleSignIn } from "@/app/actions/auth";
import { MdAccountCircle, MdPayments } from "react-icons/md";
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
              name="Access Tokens"
              href="/settings/tokens"
              icon={RiLockPasswordFill}
              onNavigate={onNavigate}
            />
            <SidebarNavItem
              name="Payment & Subscription"
              href="/settings/payment"
              icon={MdPayments}
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
    </>
  );
}
