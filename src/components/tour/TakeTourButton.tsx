"use client";

import { startTour } from "@/lib/tour/startTour";
import { MdTour } from "react-icons/md";

export default function TakeTourButton() {
  return (
    <button
      type="button"
      onClick={() => startTour()}
      className="flex items-center gap-1.5 default-radius px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
    >
      <MdTour className="text-base" />
      Take a tour
    </button>
  );
}
