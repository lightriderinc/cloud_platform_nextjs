"use client";

import { startTour } from "@/lib/tour/startTour";
import { useSyncExternalStore } from "react";
import LRButton from "@/components/ui/LRButton";

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
// corrects this on hydration.
function getSeenServerSnapshot() {
  return true;
}

export default function WelcomeModal() {
  const seen = useSyncExternalStore(
    subscribeToSeen,
    getSeenSnapshot,
    getSeenServerSnapshot,
  );
  const show = !seen;

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
          <LRButton
            variant="primary"
            onClick={handleTakeTour}
            className="w-full"
          >
            Take the tour
          </LRButton>

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
