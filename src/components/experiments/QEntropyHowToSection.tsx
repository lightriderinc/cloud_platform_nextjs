"use client";

import { startEntropyTour } from "@/lib/tour/startEntropyTour";
import { MdHelpOutline } from "react-icons/md";

export default function QEntropyHowToSection() {
  return (
    <button
      type="button"
      data-tour="q-entropy-how-to-button"
      title="A step by step guide to withdrawing quantum entropy"
      onClick={() => startEntropyTour()}
      className="inline-flex w-fit cursor-pointer items-center gap-1 text-sm font-medium text-gray-400 transition-colors hover:text-[var(--brand-primary-light)]"
    >
      How to withdraw <MdHelpOutline className="text-base" />
    </button>
  );
}
