"use client";

import { backendStats } from "@/lib/backends/overview";
import type { Backend } from "@/types/backend";
import { MdComputer, MdDns, MdMemory } from "react-icons/md";

function StatCard({
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
    <div className="default-radius border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center text-lg text-gray-500" aria-hidden>
          {icon}
        </span>
        {isLoading ? (
          <span className="block h-6 w-8 animate-pulse rounded bg-gray-200" />
        ) : (
          <span className="text-xl font-semibold leading-6 text-gray-900">{value}</span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

// Stat cards at the top of /backends. Computed from `backends`, the same
// merged list the cards render, so the numbers always match them.
export default function BackendsOverview({
  backends,
  isLoading,
  isStatusLoading,
}: {
  backends: Backend[];
  /** Card data still loading: every number is a skeleton. */
  isLoading: boolean;
  /** Statuses may still change: the online count is a skeleton. */
  isStatusLoading: boolean;
}) {
  const stats = backendStats(backends);

  return (
    <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Backends overview">
      <StatCard icon={<MdDns />} label="Total backends" value={stats.total} isLoading={isLoading} />
      <StatCard icon={<MdMemory />} label="QPUs" value={stats.qpus} isLoading={isLoading} />
      <StatCard icon={<MdComputer />} label="Simulators" value={stats.simulators} isLoading={isLoading} />
      <StatCard
        icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
        label="Online now"
        value={stats.online}
        isLoading={isLoading || isStatusLoading}
      />
    </section>
  );
}
