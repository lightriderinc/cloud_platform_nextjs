"use client";

import { useRigettiBackends } from "@/hooks/useRigettiBackends";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import CepheusConnectionTab from "./CepheusConnectionTab";
import CepheusDetailsPanel from "./CepheusDetailsPanel";
import CepheusReservationTab from "./CepheusReservationTab";
import CepheusTopologyTab from "./CepheusTopologyTab";

const CEPHEUS_BACKEND_ID = "rigetti.qpu.Cepheus-1-108Q";

type Tab = "details" | "topology" | "connection" | "reservation";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "topology", label: "Topology & Calibration" },
  { id: "connection", label: "Connection" },
  { id: "reservation", label: "Reservation" },
];

function isTab(value: string | null): value is Tab {
  return !!value && TABS.some((t) => t.id === value);
}

export default function CepheusDetailTabs({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    isTab(initialTab) ? initialTab : "details",
  );
  const { data: rigettiBackends = [], isLoading } = useRigettiBackends();
  const backend = rigettiBackends.find((b) => b.id === CEPHEUS_BACKEND_ID);

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-gray-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === t.id
                ? "border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse default-radius bg-gray-100" />
      ) : !backend ? (
        <p className="text-sm text-gray-500">
          Couldn&apos;t load this backend&apos;s data. Try again later.
        </p>
      ) : (
        <>
          {tab === "details" && <CepheusDetailsPanel backend={backend} />}
          {tab === "topology" && <CepheusTopologyTab />}
          {tab === "connection" && (
            <CepheusConnectionTab
              backend={backend}
              isAuthenticated={isAuthenticated}
            />
          )}
          {tab === "reservation" && <CepheusReservationTab />}
        </>
      )}
    </div>
  );
}
