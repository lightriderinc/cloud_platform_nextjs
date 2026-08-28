"use client";

import BackendSubmitModal from "@/components/quantum/BackendSubmitModal";
import {
  ActiveReservationCard,
  ReservationCard,
} from "@/components/reservations/MyReservationsList";
import { fetchMyReservations } from "@/lib/quantum/reservations";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { MdArrowForward } from "react-icons/md";

/** Dashboard reservations summary — active and upcoming only, no history.
 * Hidden entirely when the customer has neither. */
export default function DashboardReservations() {
  const [showSubmit, setShowSubmit] = useState(false);
  const [now] = useState(() => Date.now());

  const { data: reservations } = useQuery({
    queryKey: ["reservations", "mine"],
    queryFn: fetchMyReservations,
  });

  if (!reservations) {
    return null;
  }

  const active = reservations.filter(
    (r) => new Date(r.startTime).getTime() <= now && now <= new Date(r.endTime).getTime(),
  );
  const upcoming = reservations.filter((r) => new Date(r.startTime).getTime() > now);

  if (active.length === 0 && upcoming.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-row justify-between">
        <h2 className="text-xl font-bold text-gray-600">Reservations</h2>
        <div className="mt-3 flex justify-end">
          <Link
            href="/backends/rigetti-cepheus-1-108q?tab=reservation"
            className="text-sm font-medium text-gray-700 inline-flex items-center gap-2 hover:text-[var(--brand-primary)]"
          >
            View all reservations <MdArrowForward />
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {active.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">Active reservations</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {active.map((r) => (
                <ActiveReservationCard
                  key={r.reservationId}
                  reservation={r}
                  onSubmitJob={() => setShowSubmit(true)}
                />
              ))}
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">Upcoming reservations</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {upcoming.map((r) => (
                <ReservationCard
                  key={r.reservationId}
                  reservation={r}
                  iconColorClass="text-[var(--brand-tertiary)]"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {showSubmit && (
        <BackendSubmitModal
          backend="rigetti-cepheus"
          title="Submit a job to your reserved Cepheus-1-108Q window"
          onClose={() => setShowSubmit(false)}
        />
      )}
    </div>
  );
}
