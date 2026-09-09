"use client";

import TopologyExplorerSkeleton from "@/components/topology/TopologyExplorerSkeleton";
import { useRigettiBackends } from "@/hooks/useRigettiBackends";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import CepheusConnectionTab from "./CepheusConnectionTab";
import CepheusConnectionTabSkeleton from "./CepheusConnectionTabSkeleton";
import CepheusDetailsPanel from "./CepheusDetailsPanel";
import CepheusDetailsPanelSkeleton from "./CepheusDetailsPanelSkeleton";
import CepheusExperimentsTab from "./CepheusExperimentsTab";
import CepheusReservationTab from "./CepheusReservationTab";
import CepheusReservationTabSkeleton from "./CepheusReservationTabSkeleton";
import CepheusTopologyTab from "./CepheusTopologyTab";

const CEPHEUS_BACKEND_ID = "rigetti.qpu.Cepheus-1-108Q";

type Tab =
  | "details"
  | "topology"
  | "connection"
  | "experiments"
  | "reservation";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "topology", label: "Topology & Calibration" },
  { id: "connection", label: "Connection" },
  { id: "experiments", label: "Experiments" },
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab");

  const [tab, setTab] = useState<Tab>(() =>
    isTab(paramTab) ? paramTab : "details",
  );
  const [syncedParamTab, setSyncedParamTab] = useState(paramTab);

  if (paramTab !== syncedParamTab) {
    setSyncedParamTab(paramTab);
    if (isTab(paramTab)) {
      setTab(paramTab);
    }
  }

  const { data: rigettiBackends = [], isLoading } = useRigettiBackends();
  const backend = rigettiBackends.find((b) => b.id === CEPHEUS_BACKEND_ID);

  const tabListRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollFades = useCallback(() => {
    const el = tabListRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = tabListRef.current;
    if (!el) return;

    updateScrollFades();

    const resizeObserver = new ResizeObserver(updateScrollFades);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [updateScrollFades]);

  const handleTabChange = (nextTab: Tab) => {
    setTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  };

  return (
    <div>
      <div
        ref={tabListRef}
        onScroll={updateScrollFades}
        className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: `linear-gradient(to right, ${
            canScrollLeft ? "transparent, black 24px" : "black"
          }, ${
            canScrollRight ? "black calc(100% - 24px), transparent" : "black"
          })`,
          WebkitMaskImage: `linear-gradient(to right, ${
            canScrollLeft ? "transparent, black 24px" : "black"
          }, ${
            canScrollRight ? "black calc(100% - 24px), transparent" : "black"
          })`,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
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
        tab === "details" ? (
          <CepheusDetailsPanelSkeleton />
        ) : tab === "connection" ? (
          <CepheusConnectionTabSkeleton />
        ) : tab === "topology" ? (
          <TopologyExplorerSkeleton />
        ) : (
          <CepheusReservationTabSkeleton />
        )
      ) : !backend ? (
        <p className="text-sm text-gray-500">
          Couldn&apos;t load this backend&apos;s data. Try again later.
        </p>
      ) : (
        <>
          {tab === "details" && <CepheusDetailsPanel backend={backend} />}
          {tab === "topology" && (
            <CepheusTopologyTab isAuthenticated={isAuthenticated} />
          )}
          {tab === "connection" && (
            <CepheusConnectionTab
              backend={backend}
              isAuthenticated={isAuthenticated}
            />
          )}
          {tab === "experiments" && (
            <CepheusExperimentsTab isAuthenticated={isAuthenticated} />
          )}
          {tab === "reservation" && (
            <CepheusReservationTab isAuthenticated={isAuthenticated} />
          )}
        </>
      )}
    </div>
  );
}
