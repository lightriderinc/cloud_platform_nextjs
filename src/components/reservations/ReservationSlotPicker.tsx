"use client";

import { formatCreditsWithUsd } from "@/components/billing/CreditsSummary";
import {
  fetchAvailableSlots,
  getLocalTimezoneLabel,
  type AvailableSlot,
  type ReservationDuration,
} from "@/lib/quantum/reservations";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useRef, useState } from "react";
import { MdChevronLeft, MdChevronRight, MdSchedule } from "react-icons/md";

const DURATIONS: { value: ReservationDuration; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
];

const VISIBLE_DAYS = 3;
const ROW_MINUTES = 15;
const ROWS_PER_DAY = (24 * 60) / ROW_MINUTES; // 96
// Coupled to the row cells' `style={{ height: ROW_HEIGHT_PX }}` below — kept
// as one constant (not a Tailwind class) so the auto-scroll math below can
// never drift from the actual rendered row height.
const ROW_HEIGHT_PX = 28;

function startOfLocalDay(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function hourLabel(offsetMinutes: number): string {
  const d = new Date(2000, 0, 1, 0, offsetMinutes);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

function cellDate(day: Date, offsetMinutes: number): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(offsetMinutes / 60),
    offsetMinutes % 60,
  );
}

/**
 * Duration is passed straight through to GET /reservations/available —
 * qpu-proxy/QCS does its own 15-minute-block stitching server-side, so no
 * client-side block-merging is needed.
 *
 * Rows cover the FULL 24 hours (96 rows of 15 min) rather than being trimmed
 * to only where availability exists — a mostly-grey grid communicates real
 * scarcity ("this device is heavily booked, book early"), and trimming would
 * hide that signal. Days are always 3 CONSECUTIVE calendar days from
 * `rangeStart` (not "the first 3 days with any data") for the same reason: a
 * fully-booked day should render as a fully-grey column, not be skipped.
 */
export default function ReservationSlotPicker({
  onPick,
}: {
  onPick: (slot: AvailableSlot) => void;
}) {
  const [duration, setDuration] = useState<ReservationDuration>(15);
  const [initialRangeStart] = useState(() => new Date().toISOString());
  const [history, setHistory] = useState<string[]>([initialRangeStart]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Adjust state during render (not an effect) when duration changes, back
  // to today's page — see react.dev "Adjusting some state when a prop
  // changes." Avoids an effect-driven extra render pass for what's really
  // just a derived reset.
  const [prevDuration, setPrevDuration] = useState(duration);
  if (duration !== prevDuration) {
    setPrevDuration(duration);
    setHistory([initialRangeStart]);
  }

  const rangeStart = history[history.length - 1];

  const {
    data: slots,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["reservations", "available", duration, rangeStart],
    queryFn: () => fetchAvailableSlots(duration, rangeStart),
  });

  const visibleDays = Array.from({ length: VISIBLE_DAYS }, (_, i) =>
    addDays(startOfLocalDay(rangeStart), i),
  );

  const slotsByEpoch = new Map<number, AvailableSlot>();
  for (const slot of slots ?? []) {
    slotsByEpoch.set(new Date(slot.startTime).getTime(), slot);
  }

  // Earliest bookable row across the visible days, so the grid can
  // auto-scroll there instead of opening on an empty 3 AM.
  let firstAvailableRow: number | null = null;
  rowSearch: for (let row = 0; row < ROWS_PER_DAY; row++) {
    for (const day of visibleDays) {
      if (slotsByEpoch.has(cellDate(day, row * ROW_MINUTES).getTime())) {
        firstAvailableRow = row;
        break rowSearch;
      }
    }
  }

  useEffect(() => {
    if (scrollRef.current && firstAvailableRow !== null) {
      scrollRef.current.scrollTop = Math.max(0, firstAvailableRow * ROW_HEIGHT_PX - ROW_HEIGHT_PX);
    }
  }, [firstAvailableRow, rangeStart, duration]);

  const initialNow = new Date(initialRangeStart);
  const nowRow = Math.floor((initialNow.getHours() * 60 + initialNow.getMinutes()) / ROW_MINUTES);
  const tzLabel = getLocalTimezoneLabel(initialNow);
  const priceLabel = slots && slots.length > 0 ? formatCreditsWithUsd(slots[0].creditsPrice) : null;
  const durationLabel = DURATIONS.find((d) => d.value === duration)?.label;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration</label>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={`default-radius border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                duration === d.value
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Rigetti books in 15-minute blocks — 30/60 min windows are consecutive blocks, priced accordingly.
        </p>
        {priceLabel && (
          <p className="mt-1 text-sm font-medium text-gray-700">
            {durationLabel} — {priceLabel} per slot
          </p>
        )}
      </div>

      {/* Prominent, not fine print — a misread hour here books real money
          against a slot that can't be cancelled. */}
      <div className="flex items-center gap-2 default-radius border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
        <MdSchedule className="shrink-0 text-base" />
        All times shown in your local timezone — {tzLabel}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))}
          disabled={history.length <= 1}
          className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
        >
          <MdChevronLeft className="text-lg" /> Prev
        </button>
        <span className="text-xs text-gray-500">
          {dayLabel(visibleDays[0])} – {dayLabel(visibleDays[visibleDays.length - 1])}
        </span>
        <button
          type="button"
          onClick={() =>
            setHistory((h) => [...h, addDays(startOfLocalDay(rangeStart), VISIBLE_DAYS).toISOString()])
          }
          className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          Next <MdChevronRight className="text-lg" />
        </button>
      </div>

      {isLoading ? (
        <div className="h-72 animate-pulse default-radius bg-gray-100" />
      ) : isError ? (
        <p className="text-sm text-red-500">Failed to load available slots. Try again later.</p>
      ) : (
        <div
          ref={scrollRef}
          className="max-h-72 overflow-auto default-radius border border-gray-100"
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `48px repeat(${VISIBLE_DAYS}, minmax(64px, 1fr))` }}
          >
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white" />
            {visibleDays.map((day) => (
              <div
                key={day.toISOString()}
                className="sticky top-0 z-10 border-b border-l border-gray-100 bg-white px-1 py-1.5 text-center text-xs font-medium text-gray-700"
              >
                {dayLabel(day)}
              </div>
            ))}

            {Array.from({ length: ROWS_PER_DAY }, (_, row) => {
              const offset = row * ROW_MINUTES;
              const onTheHour = offset % 60 === 0;
              return (
                <Fragment key={row}>
                  <div
                    className="flex items-start justify-end border-t border-gray-50 pr-1.5 text-[11px] text-gray-400"
                    style={{ height: ROW_HEIGHT_PX }}
                  >
                    {onTheHour ? hourLabel(offset) : ""}
                  </div>
                  {visibleDays.map((day) => {
                    const slot = slotsByEpoch.get(cellDate(day, offset).getTime());
                    const isNowMarker = row === nowRow && isSameLocalDay(day, initialNow);
                    return (
                      <button
                        key={`${day.toISOString()}-${offset}`}
                        type="button"
                        disabled={!slot}
                        onClick={() => slot && onPick(slot)}
                        title={slot ? `${dayLabel(day)} ${hourLabel(offset) || ""}` : undefined}
                        className={[
                          "border-t border-l border-gray-50 transition-colors",
                          slot
                            ? "cursor-pointer bg-[var(--brand-primary)]/20 hover:bg-[var(--brand-primary)]/40"
                            : "cursor-not-allowed bg-gray-50",
                          isNowMarker ? "border-t-2 border-t-red-400" : "",
                        ].join(" ")}
                        style={{ height: ROW_HEIGHT_PX }}
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
