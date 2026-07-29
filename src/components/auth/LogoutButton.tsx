"use client";

import LRButton from "@/components/ui/LRButton";
import { MdLogout } from "react-icons/md";

type Props = {
  onSignOut: () => Promise<void>;
};

// Click target for the Logto sign-out server action (same pattern as
// LoginButton). Clears the local session cookie and ends the Logto session.
export default function LogoutButton({ onSignOut }: Props) {
  return (
    <LRButton
      type="button"
      icon={<MdLogout className="text-lg" />}
      iconPosition="left"
      onClick={() => onSignOut()}
      variant="secondary"
      className="min-w-[90px]"
    >
      Log out
    </LRButton>
  );
}
