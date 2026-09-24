import { handleSignIn } from "@/app/actions/auth";
import { BiSolidCoin } from "react-icons/bi";
import {
  MdAccountCircle,
  MdCardGiftcard,
  MdGroupAdd,
  MdHistory
} from "react-icons/md";
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
        <SidebarNavGroup label="Billing & Credits">
          {/* <SidebarNavItem
            name="Balance"
            href="/settings/balance"
            icon={MdWallet}
            onNavigate={onNavigate}
          /> */}
          <SidebarNavItem
            name="Manage Credits"
            href="/settings/manage-credits"
            icon={BiSolidCoin}
            onNavigate={onNavigate}
          />
          <SidebarNavItem
            name="Payment & History"
            href="/settings/purchase-history"
            icon={MdHistory}
            onNavigate={onNavigate}
          />
          <SidebarNavItem
            name="Share Credits"
            href="/settings/share-credits"
            icon={MdCardGiftcard}
            onNavigate={onNavigate}
          />
          <SidebarNavItem
            name="Rewards"
            href="/settings/refer-earn"
            icon={MdGroupAdd}
            onNavigate={onNavigate}
          />
        </SidebarNavGroup>
      )}
    </>
  );
}
