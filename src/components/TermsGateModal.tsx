"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "lr_cloud_welcome_accepted_at";
const TTL_MS = 12 * 60 * 60 * 1000;

let listeners: Array<() => void> = [];

// Exported so other client components (e.g. the onboarding WelcomeModal)
// can wait on the same acceptance state instead of duplicating the
// TTL/localStorage logic.
export function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

/** True while the welcome/terms modal still needs to be shown or accepted. */
export function getSnapshot() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const acceptedAt = parseInt(stored, 10);
    if (Date.now() - acceptedAt < TTL_MS) return false;
  }
  return true;
}

export function getServerSnapshot() {
  return false;
}

export default function TermsGateModal() {
  const pathname = usePathname();
  const show = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (pathname.startsWith("/legal")) return null;

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    listeners.forEach((l) => l());
  }

  function handleDecline() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Light Rider Cloud"
    >
      <div className="default-radius w-full max-w-md bg-white shadow-2xl animate-scale-in p-10 flex flex-col items-center text-center">
        <h1
          className="text-2xl font-semibold text-gray-700"
          style={{ fontSize: "1.75rem" }}
        >
          Welcome to Light Rider Cloud
        </h1>

        <p className="text-sm text-gray-500 mt-2 mb-4">
          This is a free, pre-release preview.
        </p>

        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          By continuing, you agree to our{" "}
          <a
            href="/legal/terms-of-use"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:color-brand-primary"
            style={{ color: "var(--brand-primary)" }}
          >
            Terms of Use
          </a>{" "}
          and{" "}
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:color-brand-primary"
            style={{ color: "var(--brand-primary)" }}
          >
            Privacy Policy
          </a>
          .
        </p>

        <button
          type="button"
          onClick={handleAccept}
          className="w-full py-3 px-6 text-white text-sm font-semibold default-radius cursor-pointer transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          Agree and enter
        </button>

        <button
          type="button"
          onClick={handleDecline}
          className="mt-4 text-xs text-gray-400 underline cursor-pointer hover:text-gray-600 transition-colors"
        >
          No thanks, take me back
        </button>
      </div>
    </div>
  );
}
