"use client";

// Auto-launching the tour now happens from the onboarding welcome modal's
// "Take the tour" button (src/components/onboarding/WelcomeModal.tsx) — the
// single first-visit entry point. This component intentionally starts
// nothing on its own anymore, so a new visitor never sees two pop-ups
// stacked on top of each other. Kept mounted (renders null) so the root
// layout doesn't need to change if something else needs this mount point
// later. See src/lib/tour/startTour.ts for the canonical startTour()/
// hasCompletedTour() used by every actual trigger.
export default function TourProvider() {
  return null;
}
