"use client";

import { formatCreditsWithUsd } from "@/components/billing/CreditsSummary";
import {
  fetchAvailableSlots,
  getLocalTimezoneLabel,
  getTimezoneCaption,
  type AvailableSlot,
  type ReservationDuration,
} from "@/lib/quantum/reservations";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useRef, useState } from "react";
import { MdChevronLeft, MdChevronRight, MdSchedule } from "react-icons/md";
import ReservationSlotPickerSkeleton from "./ReservationSlotPickerSkeleton";

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
const ROW_HEIGHT_PX = 24;

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

// Rigetti's own calendar labels every 30 minutes ("12:00 AM", "12:30 AM", …)
// with the 15-minute rows as unlabeled subdivisions between them — matched
// here rather than hourly labels, which were harder to read against.
function rowLabel(offsetMinutes: number): string {
  const d = new Date(2000, 0, 1, 0, offsetMinutes);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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

// "Sun, Aug 16 · 5:00–5:15 PM PDT" — the full bookable window plus the
// timezone, collapsed to a single AM/PM suffix when start and end share one
// (matching how people naturally write a time range).
function formatSlotTooltip(slot: AvailableSlot, tzLabel: string): string {
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);
  const day = dayLabel(start);
  const startStr = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endStr = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const startPeriod = startStr.split(" ")[1];
  const endPeriod = endStr.split(" ")[1];
  const timeRange =
    startPeriod && startPeriod === endPeriod ? `${startStr.split(" ")[0]}–${endStr}` : `${startStr}–${endStr}`;
  return `${day} · ${timeRange} ${tzLabel}`;
}

/**
 * Duration is passed straight through to GET /reservations/available —
 * qpu-proxy/QCS does its own 15-minute-block stitching server-side, so no
 * client-side block-merging is needed.
 *
 * A single call to the availability endpoint only ever returns a fixed
 * batch of 10 slots (verified live: ~2.5h of coverage at 15m, ~10h at 60m) —
 * nowhere near a 3-day grid's worth. `rangeEnd` tells our own BFF route
 * (available/route.ts) to fan out across as many upstream calls as needed
 * to cover the visible range, cached there for 30-60s since that fan-out is
 * expensive to repeat on every render.
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
  const rangeEnd = addDays(startOfLocalDay(rangeStart), VISIBLE_DAYS).toISOString();

  const {
    data: slots,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["reservations", "available", duration, rangeStart, rangeEnd],
    queryFn: () => fetchAvailableSlots(duration, rangeStart, rangeEnd),
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
  const tzCaption = getTimezoneCaption(initialNow);
  const priceLabel = slots && slots.length > 0 ? formatCreditsWithUsd(slots[0].creditsPrice) : null;
  const durationLabel = DURATIONS.find((d) => d.value === duration)?.label;

  if (isLoading) {
    return <ReservationSlotPickerSkeleton />;
  }

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
          against a slot that can't be cancelled. Placed at the top of the
          calendar area, echoing Rigetti's own "Timezone <name>" header. */}
      <div className="flex items-center gap-2 default-radius border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600">
        <MdSchedule className="shrink-0 text-base" />
        {tzCaption}
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

      {/* Legend, matching Rigetti's own filled/available vs. grey/unavailable
          layout — colored with the platform's own accent, not Rigetti's teal. */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 default-radius bg-blue-400" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 default-radius bg-gray-200" /> Unavailable
        </span>
      </div>

      {isError ? (
        <p className="text-sm text-red-500">Failed to load available slots. Try again later.</p>
      ) : (
        <div
          ref={scrollRef}
          className="max-h-72 overflow-auto default-radius border-2 border-gray-50"
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `56px repeat(${VISIBLE_DAYS}, minmax(64px, 1fr))` }}
          >
            <div className="sticky top-0 z-10 border-b border-gray-50 bg-white" />
            {visibleDays.map((day) => (
              <div
                key={day.toISOString()}
                className="sticky top-0 z-10 border-b border-l-2 border-gray-50 bg-white px-1 py-1.5 text-center text-xs font-medium text-gray-700"
              >
                {dayLabel(day)}
              </div>
            ))}

            {Array.from({ length: ROWS_PER_DAY }, (_, row) => {
              const offset = row * ROW_MINUTES;
              const onTheHalfHour = offset % 30 === 0;
              return (
                <Fragment key={row}>
                  <div
                    className="flex items-start justify-end border-t border-gray-100 pr-1.5 text-[10px] text-gray-400"
                    style={{ height: ROW_HEIGHT_PX }}
                  >
                    {onTheHalfHour ? rowLabel(offset) : ""}
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
                        title={slot ? formatSlotTooltip(slot, tzLabel) : undefined}
                        className={[
                          "border border-white transition-colors",
                          slot
                            ? "cursor-pointer bg-blue-400 hover:bg-blue-300"
                            : "cursor-not-allowed bg-gray-200",
                          isNowMarker ? "border-t-3 border-t-red-500" : "",
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
