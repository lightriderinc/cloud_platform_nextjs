import { backendAccess } from "@/lib/backends/filters";
import { getQuantumBackendId } from "@/lib/quantum/backends";
import type { Backend } from "@/types/backend";

// Numbers for the top of the /backends page, computed from the same merged
// backend list the cards render, so the tiles always match the page.

export interface BackendStats {
  total: number;
  qpus: number;
  simulators: number;
  online: number;
}

/** Online means the card's own status is "online" and the backend can be used today (not "Coming soon"). */
export function isOnlineNow(backend: Backend): boolean {
  return backend.status === "online" && backendAccess(backend) === "available";
}

export function backendStats(backends: Backend[]): BackendStats {
  let qpus = 0;
  let simulators = 0;
  let online = 0;
  for (const b of backends) {
    if (b.type === "Simulator") simulators++;
    else qpus++;
    if (isOnlineNow(b)) online++;
  }
  return { total: backends.length, qpus, simulators, online };
}

export interface ProviderSummary {
  provider: string;
  total: number;
  online: number;
}

/** One entry per provider, in the given order first, then any others alphabetically. */
export function providerSummaries(backends: Backend[], order: string[] = ["IQM", "Rigetti", "IonQ"]): ProviderSummary[] {
  const byProvider = new Map<string, ProviderSummary>();
  for (const b of backends) {
    const entry = byProvider.get(b.provider) ?? { provider: b.provider, total: 0, online: 0 };
    entry.total++;
    if (isOnlineNow(b)) entry.online++;
    byProvider.set(b.provider, entry);
  }
  const rank = (p: string) => {
    const i = order.indexOf(p);
    return i === -1 ? order.length : i;
  };
  return [...byProvider.values()].sort(
    (a, b) => rank(a.provider) - rank(b.provider) || a.provider.localeCompare(b.provider),
  );
}

// --- Most used ----------------------------------------------------------

export type UsagePeriod = "week" | "month" | "year";

export const USAGE_PERIODS: { id: UsagePeriod; label: string; days: number; emptyText: string }[] = [
  { id: "week", label: "Week", days: 7, emptyText: "No jobs yet this week" },
  { id: "month", label: "Month", days: 30, emptyText: "No jobs yet this month" },
  { id: "year", label: "Year", days: 365, emptyText: "No jobs yet this year" },
];

export function isUsagePeriod(value: string | null | undefined): value is UsagePeriod {
  return value === "week" || value === "month" || value === "year";
}

/**
 * What GET /api/backends/most-used returns: submission backend ids (e.g.
 * "iqm-garnet") ranked by jobs in the period, most first, each with its bar
 * size relative to the top backend (0 to 1, top = 1). No raw job counts.
 */
export interface BackendUsageResponse {
  period: UsagePeriod;
  usage: { backend: string; share: number }[];
}

/** Job counts to ranked relative bar sizes (top = 1, three decimals), so raw counts never leave the server. */
export function toRelativeUsage(counts: { backend: string; jobs: number }[]): BackendUsageResponse["usage"] {
  const ranked = counts
    .filter((c) => c.jobs > 0)
    .sort((a, b) => b.jobs - a.jobs || a.backend.localeCompare(b.backend));
  const top = ranked[0]?.jobs ?? 0;
  return ranked.map((c) => ({ backend: c.backend, share: Math.round((c.jobs / top) * 1000) / 1000 }));
}

export interface MostUsedRow {
  rank: number;
  backend: Backend;
  /** Bar width, 0 to 1, relative to the top backend shown. */
  share: number;
}

/**
 * Joins the ranking to the catalog cards (for name and qubits). A backend
 * with no card on the page is left out, so the panel never names a backend
 * the page doesn't show; the bars are then rescaled so the top row shown is
 * full width.
 */
export function mostUsedRows(usage: BackendUsageResponse["usage"], backends: Backend[], limit = 5): MostUsedRow[] {
  const cardBySubmissionId = new Map<string, Backend>();
  for (const b of backends) {
    const id = getQuantumBackendId(b.id);
    if (id && !cardBySubmissionId.has(id)) cardBySubmissionId.set(id, b);
  }
  const rows = usage
    .filter((u) => u.share > 0 && cardBySubmissionId.has(u.backend))
    .sort((a, b) => b.share - a.share)
    .slice(0, limit);
  const top = rows[0]?.share ?? 0;
  return rows.map((u, i) => ({
    rank: i + 1,
    backend: cardBySubmissionId.get(u.backend)!,
    share: top > 0 ? Math.min(1, u.share / top) : 0,
  }));
}

export async function fetchBackendUsage(period: UsagePeriod): Promise<BackendUsageResponse> {
  const res = await fetch(`/api/backends/most-used?period=${period}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Most used backends unavailable (HTTP ${res.status})`);
  return res.json();
}
