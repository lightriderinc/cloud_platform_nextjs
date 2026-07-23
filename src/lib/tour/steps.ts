import type { DriveStep } from "driver.js";

// Sidebar items are also mounted (off-canvas) inside the mobile drawer, so
// steps are scoped to `aside` — the desktop sidebar is the only instance
// actually visible when the tour runs.
export const TOUR_STEPS: DriveStep[] = [
  {
    element: 'aside [data-tour="sidebar-dashboard"]',
    popover: {
      title: "Dashboard",
      description: "Your home base — a quick look at recent jobs and account status.",
    },
  },
  {
    element: 'aside [data-tour="sidebar-jobs"]',
    popover: {
      title: "Jobs",
      description: "Track every quantum job you've submitted and its results.",
    },
  },
  {
    element: 'aside [data-tour="sidebar-applications"]',
    popover: {
      title: "Applications",
      description: "Browse ready-made applications you can run on quantum backends.",
    },
  },
  {
    element: 'aside [data-tour="sidebar-backends"]',
    popover: {
      title: "Backends",
      description: "See which quantum computers are available and how busy they are.",
    },
  },
  {
    element: 'aside [data-tour="sidebar-pricing"]',
    popover: {
      title: "Pricing",
      description: "Compare plans and buy compute credits whenever you need them.",
    },
  },
  {
    element: '[data-tour="header-account"]',
    popover: {
      title: "Your account",
      description: "Manage your profile, plan, and billing from here.",
    },
  },
];
