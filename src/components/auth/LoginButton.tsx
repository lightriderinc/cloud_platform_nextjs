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
      style={{ backgroundColor: "var(--brand-primary)" }}
      className="w-full default-radius px-4 py-2.5 text-sm font-medium text-white cursor-pointer transition-opacity hover:opacity-80 min-w-[110px]"
    >
      Log in
    </button>
  );
}
