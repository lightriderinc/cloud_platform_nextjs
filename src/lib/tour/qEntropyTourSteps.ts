import { entropyPricePerBitLabel } from "@/lib/entropy/pricing";
import type { DriveStep } from "driver.js";

// Mirrors the steps that used to live as static copy in
// QEntropyHowToSection -- that component is now just the button which
// starts this tour, so this array is the single source of truth for the
// content. The last step deliberately points back at that same button
// (data-tour="q-entropy-how-to-button") so a viewer always knows where to
// find it again.
export const Q_ENTROPY_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="q-entropy-picker"]',
    popover: {
      title: "Select one or more chiplets",
      description:
        "Click chiplets in the grid (Cepheus's 12-chiplet array) to add them to your withdrawal.",
    },
  },
  {
    element: '[data-tour="q-entropy-color-by"]',
    popover: {
      title: "Color by pool depth or hardware quality",
      description:
        "Switch “Color by” to compare chiplets by bits available (pool depth) or by measured qubit fidelity (fRB).<br /> Noisier, lower-fidelity qubits make better entropy sources.",
    },
  },
  {
    element: '[data-tour="q-entropy-bits"]',
    popover: {
      title: "Choose bits per chiplet",
      description: `Pick how many bits to withdraw from each selected chiplet, priced at ${entropyPricePerBitLabel()} per bit.`,
    },
  },
  {
    element: '[data-tour="q-entropy-combine"]',
    popover: {
      title: "Combine into one XOR'd stream (optional)",
      description:
        "With 2 or more chiplets selected, optionally XOR their outputs into a single combined stream.<br /> The result also reports the pairwise correlation across the sources you combined.",
    },
  },
  {
    element: '[data-tour="q-entropy-withdraw"]',
    popover: {
      title: "Click “Withdraw”",
      description:
        "Pulls confirmed bits straight from pre-generated pool inventory, so it's instant.",
    },
  },
  {
    popover: {
      title: "How to use it?",
      description:
        "Quantum entropy can be used for provably-fair game mechanics, AI/ML synthetic data, Bitcoin and cryptographic nonces, Monte Carlo simulations, and randomized software testing.",
    },
  },
  {
    element: '[data-tour="q-entropy-how-to-button"]',
    popover: {
      title: "Need help again?",
      description: "Come back to this button any time to replay the tour.",
    },
  },
];
