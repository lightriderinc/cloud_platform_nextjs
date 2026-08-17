"use client";

import { formatCreditsWithUsd } from "@/components/billing/CreditsSummary";
import BackendSubmitModal from "@/components/quantum/BackendSubmitModal";
import LRButton from "@/components/ui/LRButton";
import { fetchMyReservations, type Reservation } from "@/lib/quantum/reservations";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

function formatWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startLabel = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateLabel}, ${startLabel}–${endLabel}`;
}

function ReservationRow({
  reservation,
  onSubmitJob,
}: {
  reservation: Reservation;
  onSubmitJob: () => void;
}) {
  // Lazy initial state (not a direct Date.now() call in the render body) so
  // the render stays pure — see react-hooks/purity.
  const [now] = useState(() => Date.now());
  const isActive =
    new Date(reservation.startTime).getTime() <= now && now <= new Date(reservation.endTime).getTime();

  return (
    <div className="flex items-center justify-between gap-3 default-radius border border-gray-100 px-4 py-3 text-sm">
      <div>
        <p className="flex items-center gap-2 font-medium text-gray-800">
          {formatWindow(reservation.startTime, reservation.endTime)}
          {isActive && (
            <span className="default-radius bg-green-600 px-1.5 py-0.5 text-xs font-medium text-white">
              Active now
            </span>
          )}
        </p>
        <p className="text-gray-500">{reservation.deviceInstance}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className="font-medium text-gray-700">{formatCreditsWithUsd(reservation.chargedCredits)}</p>
        {isActive && (
          <LRButton variant="primary" onClick={onSubmitJob}>
            Submit a job
          </LRButton>
        )}
      </div>
    </div>
  );
}

/** Upcoming and past reservations — read-only, no cancellation affordance
 * anywhere (Rigetti's cancellation billing policy is unconfirmed). */
export default function MyReservationsList() {
  const [showSubmit, setShowSubmit] = useState(false);
  const [now] = useState(() => Date.now());

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["reservations", "mine"],
    queryFn: fetchMyReservations,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse default-radius bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!reservations || reservations.length === 0) {
    return (
      <div className="default-radius border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
        Reservations you book will appear here.
      </div>
    );
  }

  const upcoming = reservations.filter((r) => new Date(r.endTime).getTime() >= now);
  const past = reservations.filter((r) => new Date(r.endTime).getTime() < now);

  return (
    <>
      <div className="flex flex-col gap-6">
        {upcoming.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Upcoming</h4>
            <div className="flex flex-col gap-2">
              {upcoming.map((r) => (
                <ReservationRow
                  key={r.reservationId}
                  reservation={r}
                  onSubmitJob={() => setShowSubmit(true)}
                />
              ))}
            </div>
          </div>
        )}
        {past.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Past</h4>
            <div className="flex flex-col gap-2">
              {past.map((r) => (
                <ReservationRow
                  key={r.reservationId}
                  reservation={r}
                  onSubmitJob={() => setShowSubmit(true)}
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
    </>
  );
}
