import { Q_ENTROPY_TOUR_STEPS } from "@/lib/tour/qEntropyTourSteps";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Starts the Q-ENTROPY withdrawal walkthrough. Unlike startTour() (the
 * app-wide onboarding tour), this is always user-triggered on demand from
 * the "How to withdraw quantum entropy" button, so it has no first-visit
 * localStorage gate of its own.
 */
export function startEntropyTour() {
  driver({
    showProgress: true,
    skipMissingElement: true,
    steps: Q_ENTROPY_TOUR_STEPS,
  }).drive();
}
