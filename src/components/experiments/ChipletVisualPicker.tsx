"use client";

import ChipletBox from "@/components/topology/ChipletBox";
import { errorRateRgb, toCss } from "@/components/topology/errorGradient";
import { STATE_CLASSES } from "@/components/topology/stateStyles";
import TopologyTooltip from "@/components/topology/TopologyTooltip";
import type { TooltipState } from "@/components/topology/types";
import { DEFAULT_TOPOLOGY_BACKEND_ID, fetchQubits, type QubitEntry } from "@/lib/topology/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { CandidatesResponse, EntropyPoolsResponse } from "./types";

// Same fixed 3x4 modular layout as the topology page's own ProcessorMapCard
// (Cepheus's documented physical array) -- structural, not fetched.
export const CHIPLET_IDS = Array.from({ length: 12 }, (_, i) => `C${i + 1}`);
const GRID_COLS = 3;
// A whole-chiplet role has no per-qubit data of its own (pool depth and
// candidate tier are both chiplet-level, not qubit-level) -- 9 cells are
// rendered per chiplet purely for the same visual silhouette as the
// topology page, uniformly colored, not standing in for 9 real qubit
// measurements.
const CELLS_PER_CHIPLET = 9;

type ColorMode = "pool" | "quality";

const chipBase = "px-3 py-1.5 default-radius text-sm font-medium border transition-colors cursor-pointer";
const chipOn = "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]";
const chipOff = "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50";

function formatBits(n: number): string {
  return n.toLocaleString();
}

/**
 * The Q-ENTROPY chiplet picker, rebuilt on the topology page's own visual
 * primitives (ChipletBox, STATE_CLASSES, the fRB error gradient, and the
 * shared hover-tooltip) instead of a plain grid of boxes. Two things the
 * topology page's ProcessorMapCard does NOT do, added here:
 *   - multi-select (a click toggles membership in `selected`, rather than
 *     driving a single `Selection` used elsewhere for a side detail panel)
 *   - two possible color sources (pool depth vs. hardware quality) when
 *     selectMode is "pool"
 *
 * selectMode governs what's selectable and, in "live" mode, what colors
 * the cells:
 *   - "pool": selectable iff the pool has bits_available > 0; color is
 *     either pool depth (default) or hardware quality (toggle below the
 *     grid, fetches topology qubit data on demand).
 *   - "live": every chiplet is always selectable (a live run can target
 *     any of them); colored by q_entropy's own /candidates tier -- a
 *     workload-specific score, not a second copy of the topology toggle.
 */
export default function ChipletVisualPicker({
  selectMode,
  pools,
  candidates,
  selected,
  onToggle,
  loading,
}: {
  selectMode: "pool" | "live";
  pools: EntropyPoolsResponse | null;
  candidates: CandidatesResponse | null;
  selected: string[];
  onToggle: (chipletId: string) => void;
  loading?: boolean;
}) {
  const [colorMode, setColorMode] = useState<ColorMode>("pool");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const poolByChiplet = useMemo(
    () => Object.fromEntries((pools?.pools ?? []).map((p) => [p.chiplet_id, p])),
    [pools],
  );
  const maxBits = useMemo(() => {
    const values = Object.values(poolByChiplet)
      .map((p) => p.bits_available)
      .filter((n) => n > 0);
    return values.length ? Math.max(...values) : 0;
  }, [poolByChiplet]);

  // Hardware-quality coloring reuses the topology page's own qubit fetch
  // and fRB-simultaneous error gradient (errorGradient.ts), aggregated to
  // one mean-error-per-chiplet number -- only fetched when actually needed
  // (pool mode's "hardware quality" toggle), never for its own sake.
  const qualityEnabled = selectMode === "pool" && colorMode === "quality";
  const qualityQuery = useQuery({
    queryKey: ["topology", "qubits", DEFAULT_TOPOLOGY_BACKEND_ID],
    queryFn: () => fetchQubits(DEFAULT_TOPOLOGY_BACKEND_ID),
    enabled: qualityEnabled,
  });

  const chipletQuality = useMemo(() => {
    const byChiplet = new Map<string, QubitEntry[]>();
    for (const q of qualityQuery.data?.data ?? []) {
      if (!q.chipletId) continue;
      const list = byChiplet.get(q.chipletId) ?? [];
      list.push(q);
      byChiplet.set(q.chipletId, list);
    }
    const out: Record<string, { meanErrorPct: number | null; meanFrbPct: number | null }> = {};
    for (const cid of CHIPLET_IDS) {
      const activeValues = (byChiplet.get(cid) ?? [])
        .filter((q) => q.presence !== "absent" && q.frbSimultaneous.state === "active" && q.frbSimultaneous.value !== null)
        .map((q) => q.frbSimultaneous.value as number);
      if (activeValues.length === 0) {
        out[cid] = { meanErrorPct: null, meanFrbPct: null };
        continue;
      }
      const meanFrb = activeValues.reduce((a, b) => a + b, 0) / activeValues.length;
      out[cid] = { meanErrorPct: (1 - meanFrb) * 100, meanFrbPct: meanFrb * 100 };
    }
    return out;
  }, [qualityQuery.data]);

  const qualityErrorRange = useMemo(() => {
    const values = Object.values(chipletQuality)
      .map((s) => s.meanErrorPct)
      .filter((v): v is number => v !== null);
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
  }, [chipletQuality]);

  function showTooltip(html: string, e: { clientX: number; clientY: number }) {
    setTooltip({ html, x: e.clientX + 12, y: e.clientY + 12 });
  }
  function moveTooltip(e: { clientX: number; clientY: number }) {
    setTooltip((t) => (t ? { ...t, x: e.clientX + 12, y: e.clientY + 12 } : t));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {selectMode === "pool" && colorMode === "pool" && (
            <span className="flex items-center gap-1">
              Pool depth
              <span
                style={{
                  display: "block",
                  width: 44,
                  height: 8,
                  borderRadius: 2,
                  background: "linear-gradient(90deg, #00E494, #27728B, #4E0082)",
                }}
              />
              <span>fewer bits</span>
            </span>
          )}
          {((selectMode === "pool" && colorMode === "quality") || selectMode === "live") && (
            <span className="flex items-center gap-1">
              {selectMode === "live" ? "Candidate quality" : "Hardware quality (fRB)"}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 default-radius border border-dashed border-purple-400 bg-purple-100" />
            {selectMode === "pool" ? "Not yet generated" : "Not scored"}
          </span>
        </div>

        {selectMode === "pool" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setColorMode("pool")}
              className={`${chipBase} ${colorMode === "pool" ? chipOn : chipOff}`}
            >
              Color: Pool depth
            </button>
            <button
              type="button"
              onClick={() => setColorMode("quality")}
              className={`${chipBase} ${colorMode === "quality" ? chipOn : chipOff}`}
            >
              Color: Hardware quality
            </button>
          </div>
        )}
      </div>

      {/* Same mx-auto max-w-md cap as ProcessorMapCard's own grid wrapper —
          without it, the grid's 1fr columns stretch to fill this page's much
          wider content column, ballooning every qubit cell to ~165px square
          instead of the topology page's compact size. Same gap-4/p-3 too,
          for identical chiplet-box density between the two pages. */}
      <div className="relative mx-auto max-w-md">
        <div
          className="grid gap-4 p-3"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
        >
        {CHIPLET_IDS.map((cid) => {
          const poolEntry = poolByChiplet[cid];
          const candidateEntry = candidates?.map[cid];
          const isSelected = selected.includes(cid);

          const selectable =
            !loading &&
            (selectMode === "live" ? true : !!poolEntry && poolEntry.bits_available > 0);

          // --- color ---------------------------------------------------
          let cellClassName: string | undefined;
          let cellStyle: { backgroundColor: string; borderColor: string } | undefined;

          if (selectMode === "live") {
            const tier = candidateEntry?.tier;
            if (!candidateEntry) {
              cellClassName = STATE_CLASSES.sentinel.cell;
            } else if (tier === "unsuitable") {
              cellClassName = STATE_CLASSES.degraded.cell;
            } else if (tier === "recommended" || tier === "good") {
              cellClassName = STATE_CLASSES.active.cell;
            } else {
              cellClassName = STATE_CLASSES.sentinel.cell;
            }
          } else if (colorMode === "quality") {
            const q = chipletQuality[cid];
            if (!q || q.meanErrorPct === null) {
              cellClassName = STATE_CLASSES.sentinel.cell;
            } else if (!qualityErrorRange) {
              cellClassName = STATE_CLASSES.active.cell;
            } else {
              const rgb = errorRateRgb(q.meanErrorPct, qualityErrorRange.min, qualityErrorRange.max);
              cellStyle = { backgroundColor: toCss(rgb), borderColor: toCss(rgb) };
            }
          } else {
            // colorMode === "pool"
            if (!poolEntry || poolEntry.bits_available <= 0) {
              cellClassName = STATE_CLASSES.sentinel.cell;
            } else if (maxBits <= 0) {
              cellClassName = STATE_CLASSES.active.cell;
            } else {
              const deficit = maxBits - poolEntry.bits_available;
              const rgb = errorRateRgb(deficit, 0, maxBits);
              cellStyle = { backgroundColor: toCss(rgb), borderColor: toCss(rgb) };
            }
          }

          // --- tooltip / count label -------------------------------------
          let countLabel: string | undefined;
          let tooltipHtml: string;
          if (selectMode === "pool") {
            if (poolEntry && poolEntry.bits_available > 0) {
              countLabel = formatBits(poolEntry.bits_available);
              tooltipHtml =
                `<b>${cid} — ${formatBits(poolEntry.bits_available)} bits available</b>` +
                `calibration ${poolEntry.newest_calibration_id?.slice(0, 16) ?? "unknown"}` +
                (poolEntry.last_refill_at ? ` · refilled ${new Date(poolEntry.last_refill_at).toLocaleString()}` : "");
            } else if (poolEntry) {
              tooltipHtml = `<b>${cid} — Depleted</b>0 bits available (previously refilled${poolEntry.last_refill_at ? ` ${new Date(poolEntry.last_refill_at).toLocaleString()}` : ""}).`;
            } else {
              tooltipHtml = `<b>${cid} — Not yet generated</b>No entropy pool for this chiplet yet.`;
            }
            if (colorMode === "quality" && chipletQuality[cid]?.meanFrbPct != null) {
              tooltipHtml += `<br/>mean fRB (simultaneous): ${chipletQuality[cid].meanFrbPct!.toFixed(2)}%`;
            }
          } else {
            if (candidateEntry) {
              tooltipHtml = `<b>${cid} — ${candidateEntry.tier}</b>` + (candidateEntry.score != null ? `score ${candidateEntry.score.toFixed(3)}` : "");
            } else {
              tooltipHtml = `<b>${cid}</b>Not scored yet.`;
            }
          }

          const cells = Array.from({ length: CELLS_PER_CHIPLET }, (_, i) => ({
            key: i,
            className: cellClassName,
            style: cellStyle,
          }));

          return (
            <ChipletBox
              key={cid}
              label={cid}
              countLabel={countLabel}
              cells={cells}
              selected={isSelected}
              disabled={!selectable && !isSelected}
              onClick={() => selectable && onToggle(cid)}
              onMouseEnter={(e) => showTooltip(tooltipHtml, e)}
              onMouseMove={(e) => moveTooltip(e)}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
        </div>
      </div>

      <TopologyTooltip tooltip={tooltip} />
    </div>
  );
}
