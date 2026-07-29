"use client";

import LRButton from "@/components/ui/LRButton";

type Props = {
  onSignOut: () => Promise<void>;
};

// Click target for the Logto sign-out server action (same pattern as
// LoginButton). Clears the local session cookie and ends the Logto session.
export default function LogoutButton({ onSignOut }: Props) {
  return (
    <LRButton
      type="button"
      onClick={() => onSignOut()}
      variant="primary-outline"
      className="min-w-[90px]"
    >
      Log out
    </LRButton>
  );
}
