"use client";

import BackendSubmitModal from "@/components/quantum/BackendSubmitModal";
import { fetchMyReservations, type Reservation } from "@/lib/quantum/reservations";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MdAccessTime, MdArrowForward, MdCalendarMonth } from "react-icons/md";

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startLabel = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${startLabel}–${endLabel}`;
}

function ReservationCardDetails({
  reservation,
  iconColorClass,
}: {
  reservation: Reservation;
  iconColorClass: string;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <MdCalendarMonth className={`text-lg ${iconColorClass} opacity-75`} />
          <span className="flex items-center gap-2 font-medium text-gray-800">
            {formatDateLabel(reservation.startTime)}
          </span>
        </div>
        <div className="flex flex-row items-center gap-2">
          <MdAccessTime className={`text-lg ${iconColorClass} opacity-75`} />
          <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
            {formatTimeLabel(reservation.startTime, reservation.endTime)}
          </span>
        </div>
      </div>
      <span className="text-sm text-gray-500">{reservation.deviceInstance}</span>
    </div>
  );
}

export function ActiveReservationCard({
  reservation,
  onSubmitJob,
}: {
  reservation: Reservation;
  onSubmitJob: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSubmitJob}
      className="group relative flex w-full cursor-pointer flex-col justify-between items-start gap-3 default-radius border border-gray-100 bg-gray-100 p-4 text-left card-hover-primary"
    >
      <div className="absolute top-2 right-2">
        <span className="rounded bg-green-600 px-2.5 py-0.5 text-xs font-medium text-white">
          Active now
        </span>
      </div>
      <ReservationCardDetails
        reservation={reservation}
        iconColorClass="text-[var(--brand-tertiary)]"
      />
      <div className="flex w-full items-center justify-end gap-1">
        <span className="text-sm font-medium text-gray-700 transition duration-150 group-hover:text-[var(--brand-primary)]">
          Submit a job
        </span>
        <MdArrowForward className="text-lg text-gray-400 transition-colors duration-150 group-hover:text-[var(--brand-primary)]" />
      </div>
    </button>
  );
}

export function ReservationCard({
  reservation,
  iconColorClass,
}: {
  reservation: Reservation;
  iconColorClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 default-radius border border-gray-50 bg-gray-50 p-4 text-sm">
      <ReservationCardDetails reservation={reservation} iconColorClass={iconColorClass} />
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse default-radius bg-gray-100" />
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

  const active = reservations.filter(
    (r) => new Date(r.startTime).getTime() <= now && now <= new Date(r.endTime).getTime(),
  );
  const upcoming = reservations.filter((r) => new Date(r.startTime).getTime() > now);
  const past = reservations.filter((r) => new Date(r.endTime).getTime() < now);

  return (
    <>
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
        {past.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">Previous reservations</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {past.map((r) => (
                <ReservationCard
                  key={r.reservationId}
                  reservation={r}
                  iconColorClass="text-gray-400"
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
