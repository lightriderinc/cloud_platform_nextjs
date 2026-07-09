"use client";

type Props = {
  onSignIn: () => Promise<void>;
};

// Brand-gradient "Log in" button for the header. Client component so the
// click can trigger the Logto sign-in server action passed down from Header
// (same pattern as the guide's sign-in.tsx). Desktop-only, like its
// "Get early access" neighbor.
export default function LoginButton({ onSignIn }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSignIn()}
      className="hidden lg:block default-radius bg-gradient-to-r from-[#f26739] to-[#ef3b39] px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-[filter] hover:brightness-105 min-w-[90px]"
    >
      Log in
    </button>
  );
}
