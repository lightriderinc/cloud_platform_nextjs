"use client";

type Props = {
  onSignOut: () => Promise<void>;
};

// Click target for the Logto sign-out server action (same pattern as
// LoginButton). Clears the local session cookie and ends the Logto session.
export default function LogoutButton({ onSignOut }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSignOut()}
      className="default-radius px-3 py-2 text-sm font-semibold text-brand-primary cursor-pointer btn-outline-brand transition-opacity min-w-[90px]"
    >
      Log out
    </button>
  );
}
