"use client";

import { startTour } from "@/lib/tour/startTour";
import { MdMap } from "react-icons/md";

export default function TakeTourButtonClient({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) return null;

  return (
    <button
      type="button"
      onClick={() => startTour()}
      className="mb-1 flex w-full items-center gap-2 default-radius px-2 py-1.5 text-sm transition-colors hover:bg-gray-50 cursor-pointer"
    >
      <MdMap className="text-gray-500" />
      Quick Tour
    </button>
  );
}
