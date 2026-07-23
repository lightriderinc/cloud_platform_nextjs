"use client";

import {
  getServerSnapshot as getTermsServerSnapshot,
  getSnapshot as getTermsSnapshot,
  subscribe as subscribeToTerms,
} from "@/components/TermsGateModal";
import { startTour } from "@/lib/tour/startTour";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "lr_welcome_seen";

// Give the modal time to actually unmount before driver.js measures element
// positions for the first highlighted step.
const TOUR_START_DELAY_MS = 300;

let listeners: Array<() => void> = [];

function subscribeToSeen(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getSeenSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

// Match "seen" on the server so nothing renders during SSR; the client
// corrects this on hydration, same as TermsGateModal does for its own state.
function getSeenServerSnapshot() {
  return true;
}

export default function WelcomeModal() {
  // Wait for the legal terms modal (src/components/TermsGateModal.tsx) to be
  // accepted first, so a brand-new visitor never sees two modals stacked on
  // top of each other. `show` is derived fresh every render from both
  // external stores rather than cached in local state — otherwise a stale
  // read during the hydration correction window can "stick" the modal
  // visible even after termsPending flips back to true.
  const termsPending = useSyncExternalStore(
    subscribeToTerms,
    getTermsSnapshot,
    getTermsServerSnapshot,
  );
  const seen = useSyncExternalStore(
    subscribeToSeen,
    getSeenSnapshot,
    getSeenServerSnapshot,
  );
  const show = !termsPending && !seen;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    listeners.forEach((l) => l());
  }

  function handleSkip() {
    dismiss();
  }

  function handleTakeTour() {
    dismiss();
    setTimeout(() => {
      startTour();
    }, TOUR_START_DELAY_MS);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Light Rider"
    >
      <div className="default-radius w-full max-w-md bg-white shadow-2xl animate-scale-in p-10 flex flex-col items-center text-center">
        <h1
          className="text-2xl font-semibold text-gray-700"
          style={{ fontSize: "1.75rem" }}
        >
          Welcome to Light Rider
        </h1>

        <p className="text-sm text-gray-600 mt-2 mb-6 leading-relaxed">
          Want a quick guided tour of the dashboard, jobs, and pricing? It
          only takes a minute.
        </p>

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={handleTakeTour}
            className="w-full py-3 px-6 text-white text-sm font-semibold default-radius cursor-pointer transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            Take the tour
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2 text-xs text-gray-400 underline cursor-pointer hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
