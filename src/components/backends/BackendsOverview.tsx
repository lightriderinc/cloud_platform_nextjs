"use client";

import {
  backendStats,
  fetchBackendUsage,
  mostUsedRows,
  providerSummaries,
  USAGE_PERIODS,
  type UsagePeriod,
} from "@/lib/backends/overview";
import type { Backend } from "@/types/backend";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MdComputer, MdDns, MdMemory } from "react-icons/md";

const panel = "default-radius border border-gray-100 bg-gray-50";
const segmentBase = "default-radius px-3 py-1 text-xs font-medium transition-colors cursor-pointer";
const segmentOn = "bg-gray-700 text-white";
const segmentOff = "text-gray-500 hover:bg-gray-100";

function SkeletonBar({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded bg-gray-200 ${className}`} />;
}

function StatTile({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isLoading: boolean;
}) {
  return (
    <div className={`${panel} flex flex-col justify-between gap-4 p-4`}>
      <span className="flex h-9 w-9 items-center justify-center default-radius bg-white text-xl text-gray-600" aria-hidden>
        {icon}
      </span>
      <div>
        {isLoading ? (
          <SkeletonBar className="h-8 w-12" />
        ) : (
          <p className="text-3xl font-semibold leading-none text-gray-900">{value}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function MostUsedPanel({ backends, backendsLoading }: { backends: Backend[]; backendsLoading: boolean }) {
  const [period, setPeriod] = useState<UsagePeriod>("week");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["backends", "most-used", period],
    queryFn: () => fetchBackendUsage(period),
    staleTime: 5 * 60_000,
  });
  const rows = data ? mostUsedRows(data.usage, backends) : [];
  const emptyText = USAGE_PERIODS.find((p) => p.id === period)!.emptyText;
  const loading = isLoading || backendsLoading;

  return (
    <div className={`${panel} flex flex-1 flex-col p-4`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Most used</h2>
        <div className="flex items-center gap-1 default-radius border border-gray-100 bg-white p-1" role="group" aria-label="Period">
          {USAGE_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
              className={`${segmentBase} ${period === p.id ? segmentOn : segmentOff}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ol className="flex flex-col gap-3" aria-label="Loading most used backends">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3">
              <SkeletonBar className="h-4 w-4" />
              <SkeletonBar className="h-4 w-36" />
              <SkeletonBar className="ml-auto h-2 w-1/3" />
            </li>
          ))}
        </ol>
      ) : isError ? (
        <p className="flex flex-1 items-center justify-center py-6 text-sm text-gray-500">
          Usage is unavailable right now.
        </p>
      ) : rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-6 text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.backend.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,40%)] items-center gap-3 text-sm">
              <span className="text-gray-400 tabular-nums">{row.rank}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-gray-900" title={row.backend.name}>
                  {row.backend.name}
                </span>
                <span className="block text-xs text-gray-500">{row.backend.qubits} qubits</span>
              </span>
              {/* Bar only: job counts are deliberately not shown. */}
              <span className="block h-2 overflow-hidden rounded-full bg-gray-200" aria-hidden>
                <span
                  className="block h-full rounded-full bg-[var(--brand-primary)]"
                  style={{ width: `${Math.max(4, row.share * 100)}%` }}
                />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// Top of /backends: four stat tiles, the most used backends, and a provider
// strip that filters the list below. Everything is computed from `backends`,
// the same merged list the cards render, so the numbers always match them.
export default function BackendsOverview({
  backends,
  isLoading,
  isStatusLoading,
  activeProvider,
  onSelectProvider,
}: {
  backends: Backend[];
  /** Card data still loading: every number is a skeleton. */
  isLoading: boolean;
  /** Statuses may still change: the online counts are skeletons. */
  isStatusLoading: boolean;
  /** The provider currently filtered on alone, if any. */
  activeProvider: string | null;
  onSelectProvider: (provider: string) => void;
}) {
  const stats = backendStats(backends);
  const providers = providerSummaries(backends);
  const onlineLoading = isLoading || isStatusLoading;

  return (
    <section className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Backends overview">
      <div className="grid grid-cols-2 grid-rows-2 gap-4">
        <StatTile icon={<MdDns />} label="Total backends" value={stats.total} isLoading={isLoading} />
        <StatTile icon={<MdMemory />} label="QPUs" value={stats.qpus} isLoading={isLoading} />
        <StatTile icon={<MdComputer />} label="Simulators" value={stats.simulators} isLoading={isLoading} />
        <StatTile
          icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
          label="Online now"
          value={stats.online}
          isLoading={onlineLoading}
        />
      </div>

      <div className="flex flex-col gap-4">
        <MostUsedPanel backends={backends} backendsLoading={isLoading} />

        <div className={`${panel} flex flex-wrap items-center gap-2 px-4 py-3`} aria-label="Providers">
          <span className="mr-1 text-xs font-medium text-gray-500">Providers</span>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonBar key={i} className="h-7 w-28" />)
            : providers.map((p) => {
                const active = activeProvider === p.provider;
                return (
                  <button
                    key={p.provider}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectProvider(p.provider)}
                    title={active ? `Show all providers` : `Show only ${p.provider} backends`}
                    className={`flex items-center gap-2 default-radius border px-3 py-1 text-xs transition-colors cursor-pointer ${
                      active
                        ? "border-gray-700 bg-gray-700 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-semibold">{p.provider}</span>
                    <span className={active ? "text-gray-200" : "text-gray-500"}>
                      {p.total} {p.total === 1 ? "backend" : "backends"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                      {onlineLoading ? (
                        <SkeletonBar className="h-3 w-3" />
                      ) : (
                        <span className={active ? "text-gray-200" : "text-gray-500"}>{p.online} online</span>
                      )}
                    </span>
                  </button>
                );
              })}
        </div>
      </div>
    </section>
  );
}
