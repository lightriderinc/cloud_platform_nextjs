import { TOUR_STEPS } from "@/lib/tour/steps";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const STORAGE_KEY = "lr_tour_completed";

export function hasCompletedTour(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Starts the guided tour. This never runs on its own — every call site
 * (TakeTourButton, the onboarding WelcomeModal's "Take the tour" button)
 * triggers it explicitly, so a visitor never gets it stacked on top of
 * another modal.
 */
export function startTour() {
  driver({
    showProgress: true,
    skipMissingElement: true,
    steps: TOUR_STEPS,
    onDestroyed: () => {
      localStorage.setItem(STORAGE_KEY, "true");
    },
  }).drive();
}
