import { QUANTUM_BACKENDS } from "@/lib/quantum/backends";
import type { Backend } from "@/types/backend";

/**
 * Synthetic catalog id for the "book a guaranteed slot" card — a Light Rider
 * product concept layered on top of the same physical Cepheus-1-108Q device
 * the on-demand "rigetti-cepheus" QUANTUM_BACKENDS entry already submits to,
 * not a distinct Rigetti backend. Kept out of backends.ts/rigetti/client.ts
 * on purpose (see BackendCatalog.tsx) so deleting this feature later is a
 * clean removal of this file + the reservation components + a couple of
 * call-site checks, with zero touch to the real backend catalog code.
 */
export const RESERVED_CEPHEUS_BACKEND_ID = "rigetti.qpu.Cepheus-1-108Q:reserved";

export function isReservationCatalogId(id: string): boolean {
  return id === RESERVED_CEPHEUS_BACKEND_ID;
}

// Same physical device as the "rigetti-cepheus" QUANTUM_BACKENDS entry —
// reused from there rather than re-hardcoded, so the two stay in sync.
export const RESERVATION_DEVICE_INSTANCE = QUANTUM_BACKENDS["rigetti-cepheus"].deviceInstance;

// Synthetic /backends catalog card for the reservation flow — a second,
// UI-only entry alongside the real ISA-derived Rigetti cards from
// rigetti/client.ts, added at the BackendCatalog.tsx composition layer (not
// inside rigetti/client.ts, which stays honestly ISA-derived). `qubits: 107`
// mirrors the real Cepheus-1-108Q's actual live node count, same as the
// mock card in rigetti/client.ts.
export const RESERVED_CEPHEUS_BACKEND_CARD: Backend = {
  id: RESERVED_CEPHEUS_BACKEND_ID,
  name: "Rigetti Cepheus-1-108Q (Reserved)",
  type: "QPU",
  status: "online",
  qubits: 107,
  provider: "Rigetti",
  queueDepth: null,
  details: {
    description:
      "Book a guaranteed time slot on the real Cepheus-1-108Q QPU — pay upfront for exclusive access during your window, instead of best-effort submission whenever the device happens to be free.",
  },
};

export type ReservationDuration = 15 | 30 | 60;

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  /** Rigetti's raw cost in cents. */
  priceCents: number;
  /** round(priceCents * RESERVATION_MARKUP_MULTIPLIER) — what the customer actually pays, in credits. */
  creditsPrice: number;
}

export interface Reservation {
  reservationId: string;
  qcsReservationId: string;
  deviceInstance: string;
  startTime: string;
  endTime: string;
  priceCents: number;
  chargedCredits: number;
  notes?: string | null;
  createdAt: string;
}

/**
 * Short local timezone abbreviation (e.g. "PDT") for a given instant — used
 * to make the timezone of displayed slot times unambiguous. Takes a
 * reference date (rather than always "now") so it reflects the right side
 * of a DST transition for dates that aren't today.
 */
export function getLocalTimezoneLabel(referenceDate: Date): string {
  const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(
    referenceDate,
  );
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

async function parseErrorBody(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({}));
}

export async function fetchAvailableSlots(
  duration: ReservationDuration,
  startTimeFrom?: string,
): Promise<AvailableSlot[]> {
  const params = new URLSearchParams({
    device_instance: RESERVATION_DEVICE_INSTANCE,
    duration: String(duration),
  });
  if (startTimeFrom) params.set("start_time_from", startTimeFrom);

  const res = await fetch(`/api/lr/reservations/available?${params}`);
  if (!res.ok) {
    const data = await parseErrorBody(res);
    throw new Error((data.message as string) ?? (data.error as string) ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.available ?? [];
}

/** The slot was booked by someone else between listing and confirming — pick another. */
export class ReservationSlotUnavailableError extends Error {
  constructor() {
    super("That slot was just booked by someone else. Pick another time.");
    this.name = "ReservationSlotUnavailableError";
  }
}

/** Our own Rigetti account is out of funds — not a customer-facing credits problem. */
export class ReservationUnavailableError extends Error {
  constructor() {
    super("Booking is temporarily unavailable. Please try again later.");
    this.name = "ReservationUnavailableError";
  }
}

export async function bookReservation(params: {
  startTime: string;
  endTime: string;
  /** The price shown in the slot picker — used only for a pre-check; the actual charge always uses the confirmed price qpu-proxy returns. */
  quotedPriceCents: number;
  notes?: string;
}): Promise<Reservation> {
  const res = await fetch("/api/lr/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_instance: RESERVATION_DEVICE_INSTANCE,
      start_time: params.startTime,
      end_time: params.endTime,
      quoted_price_cents: params.quotedPriceCents,
      notes: params.notes,
    }),
  });

  if (!res.ok) {
    const data = await parseErrorBody(res);
    if (res.status === 409 && data.error === "slot_unavailable") {
      throw new ReservationSlotUnavailableError();
    }
    if (res.status === 503 && data.error === "reservation_unavailable") {
      throw new ReservationUnavailableError();
    }
    throw new Error((data.message as string) ?? (data.error as string) ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchMyReservations(): Promise<Reservation[]> {
  const res = await fetch("/api/lr/reservations");
  if (!res.ok) {
    const data = await parseErrorBody(res);
    throw new Error((data.message as string) ?? (data.error as string) ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.reservations ?? [];
}
