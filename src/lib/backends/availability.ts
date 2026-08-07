import type { AvailabilityWindow, BackendAvailability } from "@/types/backend";

// Shared helpers for the live queue + availability shown on backend cards and
// in the detail modal. `deriveAvailability` runs where the provider data is
// fetched (lib/iqm/client.ts); the formatters run in the UI. Kept together so
// the two surfaces phrase queue and availability identically.

// Turns a provider's list of available time windows into the summary the UI
// renders. Simulators are always available (no hardware queue/windows).
// Returns undefined when there's no usable window data, so callers omit the
// field rather than render a misleading "unavailable".
export function deriveAvailability(
  available: AvailabilityWindow[] | undefined,
  isSimulator: boolean,
): BackendAvailability | undefined {
  if (isSimulator) return { availableNow: true, nextWindowStart: null };
  if (!available || available.length === 0) return undefined;

  const now = Date.now();
  const windows = available
    .filter(
      (w) =>
        Number.isFinite(Date.parse(w.start)) &&
        Number.isFinite(Date.parse(w.end)),
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  if (windows.length === 0) return undefined;

  const availableNow = windows.some(
    (w) => Date.parse(w.start) <= now && now < Date.parse(w.end),
  );
  if (availableNow) return { availableNow: true, nextWindowStart: null, windows };

  const next = windows.find((w) => Date.parse(w.start) > now);
  return { availableNow: false, nextWindowStart: next?.start ?? null, windows };
}

// "3 jobs" / "1 job" / "—" for an unknown depth. Matches the phrasing the
// backend modal already used for its queue line.
export function formatQueue(queueDepth: number | null): string {
  if (queueDepth === null) return "—";
  return `${queueDepth} ${queueDepth === 1 ? "job" : "jobs"}`;
}

// Short label for a card/modal row: "Available now", "Available at 8:00 PM"
// (later today), or "Available Fri, 8:00 PM" (another day). Returns null when
// we can't say, so callers omit the row.
export function formatAvailability(
  availability: BackendAvailability | undefined,
): string | null {
  if (!availability) return null;
  if (availability.availableNow) return "Available now";
  if (!availability.nextWindowStart) return null;

  const start = new Date(availability.nextWindowStart);
  if (Number.isNaN(start.getTime())) return null;

  const time = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const now = new Date();
  const sameDay =
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate();
  if (sameDay) return `Available at ${time}`;

  const day = start.toLocaleDateString([], { weekday: "short" });
  return `Available ${day}, ${time}`;
}

// Tailwind text color for the availability label: the status badge's online
// green when available now, its offline gray otherwise — so the availability
// text tracks the same palette as the status light.
export function availabilityTextClass(
  availability: BackendAvailability | undefined,
): string {
  return availability?.availableNow ? "text-green-700" : "text-gray-500";
}
