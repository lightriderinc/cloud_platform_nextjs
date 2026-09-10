"use client";

import { handleSignIn } from "@/app/actions/auth";
import LRButton from "@/components/ui/LRButton";

type Props = {
  /** What the visitor was trying to reach, e.g. "your account settings". */
  target?: string;
};

/**
 * Shown where a signed-out visitor lands on a signed-in-only page.
 *
 * Deliberately not the 401 "Access denied" screen: that reads as a permission
 * failure the user can do nothing about, which is alarming and confusing when
 * the real situation is simply "you are signed out" — including the very
 * common case where their session just ended on another Light Rider platform
 * while they were mid-task. This offers the one action that actually helps.
 */
export default function SignInRequired({ target = "this page" }: Props) {
  return (
    <div className="animate-fade-in-up flex flex-col items-center justify-center text-center p-12 border border-dashed border-gray-200 default-radius bg-gray-50 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-700">
        You&apos;re signed out
      </h1>
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
