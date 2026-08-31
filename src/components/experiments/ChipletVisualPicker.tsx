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
  // The crash: `candidates?.map[cid]` only guards `candidates` itself being
  // null — if candidates is a non-null object but its `map` field is absent
  // (POST /candidates is an unvalidated passthrough to rigetti-proxy; see
  // CandidatesResponse in types.ts), `candidates.map[cid]` throws "Cannot
  // read properties of undefined (reading 'C1')" on the first chiplet.
  // Resolved once here, same defensive pattern as poolByChiplet above, so
  // every render reads from a guaranteed-safe object regardless of mode,
  // loading state, or upstream shape.
  const candidateByChiplet = useMemo(() => candidates?.map ?? {}, [candidates]);
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
      {/* Secondary metadata, visually quieter than the grid itself (smaller
          text, muted toggle) -- the chiplet grid is the main event here, this
          is just the key to reading it. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-2xs text-gray-400">
          {selectMode === "pool" && colorMode === "pool" && (
            <span className="flex items-center gap-1">
              Pool depth
              <span
                style={{
                  display: "block",
                  width: 36,
                  height: 6,
                  borderRadius: 2,
                  background: "linear-gradient(90deg, #00E494, #27728B, #4E0082)",
                }}
              />
              <span>fewer bits</span>
            </span>
          )}
          {/* Same gradient-swatch + endpoint-labels treatment as pool depth
              above -- was missing entirely for this mode before. Order is
              high-to-low fidelity left-to-right, matching errorRateRgb's
              actual mapping (t=0 -> cyan -> low error/high fidelity; t=1 ->
              purple -> high error/low fidelity), same direction
              ProcessorMapCard's own quality legend uses on the topology
              page. */}
          {selectMode === "pool" && colorMode === "quality" && (
            <span className="flex items-center gap-1">
              Hardware quality (fRB)
              <span>higher fidelity</span>
              <span
                style={{
                  display: "block",
                  width: 36,
                  height: 6,
                  borderRadius: 2,
                  background: "linear-gradient(90deg, #00E494, #27728B, #4E0082)",
                }}
              />
              <span>lower fidelity</span>
            </span>
          )}
          {/* Live mode's candidate tier is categorical (recommended/good vs.
              unsuitable), not a continuous scale, so this is discrete
              swatches -- deliberately no gradient here, unlike the two
              blocks above. Colors match STATE_CLASSES exactly (bg-green-500
              / bg-amber-400), the same classes the cells themselves use for
              these two tiers, so the swatch is never an approximation of
              the real cell color. The "not scored" swatch below already
              covers both "no candidate data" and any tier value besides
              recommended/good/unsuitable (e.g. "available" per
              CandidateTier's type) -- that tier currently isn't visually
              distinguished from "not scored" at all, which is worth a
              product decision on its own if that distinction matters. */}
          {selectMode === "live" && (
            <span className="flex items-center gap-1">
              Candidate quality
              <span className="ml-1 flex items-center gap-1">
                <span className="h-2 w-2 default-radius bg-green-500" />
                Recommended
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 default-radius bg-amber-400" />
                Unsuitable
              </span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 default-radius border border-dashed border-purple-400 bg-purple-100" />
            {selectMode === "pool" ? "Not yet generated" : "Not scored"}
          </span>
        </div>

        {selectMode === "pool" && (
          <div className="flex items-center gap-1 text-2xs text-gray-400">
            <span className="mr-0.5">Color by</span>
            <button
              type="button"
              onClick={() => setColorMode("pool")}
              className={`default-radius px-1.5 py-0.5 font-medium transition-colors cursor-pointer ${
                colorMode === "pool" ? "bg-gray-200 text-gray-700" : "hover:text-gray-600"
              }`}
            >
              Pool depth
            </button>
            <button
              type="button"
              onClick={() => setColorMode("quality")}
              className={`default-radius px-1.5 py-0.5 font-medium transition-colors cursor-pointer ${
                colorMode === "quality" ? "bg-gray-200 text-gray-700" : "hover:text-gray-600"
              }`}
            >
              Hardware quality
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
          const candidateEntry = candidateByChiplet[cid];
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
