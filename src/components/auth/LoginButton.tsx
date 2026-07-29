"use client";

import LRButton from "@/components/ui/LRButton";

type Props = {
  onSignIn: () => Promise<void>;
};

// Brand-gradient "Log in" button for the header. Client component so the
// click can trigger the Logto sign-in server action passed down from Header
// (same pattern as the guide's sign-in.tsx). Desktop-only, like its
// "Get early access" neighbor.
export default function LoginButton({ onSignIn }: Props) {
  return (
    <LRButton
      type="button"
      onClick={() => onSignIn()}
      variant="primary"
      className="w-full min-w-[110px]"
    >
      Log in
    </LRButton>
  );
}
