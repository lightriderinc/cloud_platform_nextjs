"use client";

import LRButton from "@/components/ui/LRButton";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ACCOUNT_PATH = "/settings/account";

/**
 * Blocking gate shown to users who signed up through a social/SSO connector and
 * have no password yet. They must set one (on the account page) before
 * continuing, so this renders a non-dismissible modal with a single action that
 * routes to /settings/account.
 *
 * Hidden while already on the account page (so the "Set Password" control there
 * is reachable) and whenever the user does have a password. Fails open: only
 * shows when the status endpoint explicitly reports `hasPassword: false`, so a
 * lookup error never traps anyone.
 *
 * Mounted once in the root layout — matches the WelcomeModal pattern.
 */
export default function SetPasswordGateModal() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/password-status")
      .then((res) => (res.ok ? res.json() : { hasPassword: true }))
      .then((data: { hasPassword?: boolean }) => {
        if (!cancelled) setHasPassword(data.hasPassword ?? true);
      })
      .catch(() => {
        if (!cancelled) setHasPassword(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onAccountPage = pathname?.startsWith(ACCOUNT_PATH) ?? false;
  const show = hasPassword === false && !onAccountPage;

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Set a password to continue"
    >
      <div className="default-radius w-full max-w-md bg-white shadow-2xl animate-scale-in p-10 flex flex-col items-center text-center">
        <h1 className="text-2xl font-semibold text-gray-700">
          Set a password to continue
        </h1>

        <p className="text-sm text-gray-600 mt-2 mb-6 leading-relaxed">
          You signed up with a connected account, so your Light Rider account
          doesn&apos;t have a password yet. Set one to secure your account and
          continue.
        </p>

        <LRButton
          variant="primary"
          onClick={() => router.push(ACCOUNT_PATH)}
          className="w-full"
        >
          Set password
        </LRButton>
      </div>
    </div>
  );
}
