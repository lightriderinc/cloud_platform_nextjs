"use client";

import { handleSignIn } from "@/app/actions/auth";
import LRButton from "@/components/ui/LRButton";
import {
  setSilentSsoStatus,
  useSilentSsoStatus,
} from "@/lib/auth/silent-sso-status";
import { useEffect } from "react";

type Props = {
  /** What the visitor was trying to reach, e.g. "your account settings". */
  target?: string;
};

/**
 * Backstop for the "checking" state: if SessionSync never reports (it failed to
 * mount, or the network is very slow), stop waiting and show the prompt.
 */
const CHECKING_MAX_MS = 5_000;

/**
 * Shown where a signed-out visitor lands on a signed-in-only page. The page
 * decides this on the server, so the protected content itself never renders.
 *
 * Deliberately not the 401 "Access denied" screen: that reads as a permission
 * failure the user can do nothing about, which is alarming and confusing when
 * the real situation is simply "you are signed out" — including the very
 * common case where their session just ended on another Light Rider platform
 * while they were mid-task. This offers the one action that actually helps.
 *
 * While SessionSync's silent SSO check may still sign the visitor in from a
 * session on another Light Rider app, this shows a neutral "checking" state
 * instead of the prompt, so the prompt never flashes up only to be replaced.
 */
export default function SignInRequired({ target = "this page" }: Props) {
  const status = useSilentSsoStatus();

  useEffect(() => {
    if (status !== "pending") return;
    const timer = window.setTimeout(
      () => setSilentSsoStatus("settled"),
      CHECKING_MAX_MS,
    );
    return () => window.clearTimeout(timer);
  }, [status]);

  // Coming Back to a page that left for the silent check restores it from the
  // back/forward cache still marked "redirecting"; it is not checking anymore.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setSilentSsoStatus("settled");
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (status !== "settled") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-gray-200 default-radius bg-gray-50 max-w-3xl"
      >
        <p className="text-sm text-gray-500 animate-pulse">
          Checking your session…
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up flex flex-col items-center justify-center text-center p-12 border border-dashed border-gray-200 default-radius bg-gray-50 max-w-3xl">
      <h2 className="text-2xl font-semibold text-gray-700">
        You&apos;re signed out
      </h2>
      <p className="mt-2 mb-6 text-sm text-gray-600">
        Log in to access {target}.
      </p>
      <LRButton
        type="button"
        onClick={() => handleSignIn()}
        variant="primary"
        className="min-w-[110px]"
      >
        Log in
      </LRButton>
    </div>
  );
}
