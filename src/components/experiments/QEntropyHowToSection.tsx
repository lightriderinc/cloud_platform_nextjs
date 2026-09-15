"use client";

import { startEntropyTour } from "@/lib/tour/startEntropyTour";
import { MdInfoOutline } from "react-icons/md";

export default function QEntropyHowToSection() {
  return (
    <button
      type="button"
      data-tour="q-entropy-how-to-button"
      onClick={() => startEntropyTour()}
      className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] transition-colors hover:text-[var(--brand-primary-light)]"
    >
      <MdInfoOutline className="text-base" />
      How to withdraw quantum entropy
    </button>
  );
}
