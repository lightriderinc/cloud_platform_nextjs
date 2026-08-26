"use client";

import type { CorridorEntry, QubitEntry } from "@/lib/topology/client";
import { formatFidelityPct, formatMetricValue, formatScore } from "@/lib/topology/format";
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { STATE_CLASSES } from "./stateStyles";
import type { Selection, TooltipState } from "./types";

// Layout choice (not data): 12 chiplets rendered 3-per-row, matching
// Cepheus's documented 3x4 modular array. Chiplet identity, membership, and
// every value below come from the live qubits/edges/corridors responses on
// every load — nothing here is a fixed lookup table of which chiplet holds
// which qubits.
const CHIPLET_GRID_COLS = 3;

// Interpolates green-200 -> green-600 across the live meanFcz range actually
// present (never a fixed guess baked in from a frozen snapshot).
function fczColor(value: number, lo: number, hi: number): string {
  const t = hi === lo ? 1 : Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
  const from = [187, 247, 208];
  const to = [22, 163, 74];
  const rgb = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export default function ProcessorMapCard({
  allCorridors,
  chipletIds,
  qubitsByChiplet,
  isLoading,
  fczRange,
  onSelect,
  onTooltip,
}: {
  allCorridors: CorridorEntry[];
  chipletIds: string[];
  qubitsByChiplet: Map<string, QubitEntry[]>;
  isLoading: boolean;
  fczRange: { lo: number; hi: number };
  onSelect: (s: Selection) => void;
  onTooltip: Dispatch<SetStateAction<TooltipState | null>>;
}) {
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function drawCorridors() {
    const svg = svgRef.current;
    const wrap = mapWrapRef.current;
    if (!svg || !wrap) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const wrapRect = wrap.getBoundingClientRect();
    svg.setAttribute("width", String(wrapRect.width));
    svg.setAttribute("height", String(wrapRect.height));
    svg.setAttribute("viewBox", `0 0 ${wrapRect.width} ${wrapRect.height}`);

    for (const corridor of allCorridors) {
      const [aId, bId] = corridor.corridorId.split("-");
      const elA = document.getElementById(`chip-${aId}`);
      const elB = document.getElementById(`chip-${bId}`);
      if (!elA || !elB) continue;
      const ra = elA.getBoundingClientRect();
      const rb = elB.getBoundingClientRect();
      const ax = ra.left - wrapRect.left + ra.width / 2;
      const ay = ra.top - wrapRect.top + ra.height / 2;
      const bx = rb.left - wrapRect.left + rb.width / 2;
      const by = rb.top - wrapRect.top + rb.height / 2;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const pullX = (ra.width / 2 - 2) * (dx / len);
      const pullY = (ra.height / 2 - 2) * (dy / len);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(ax + pullX));
      line.setAttribute("y1", String(ay + pullY));
      line.setAttribute("x2", String(bx - pullX));
      line.setAttribute("y2", String(by - pullY));
      line.setAttribute(
        "stroke-width",
        corridor.score === null ? "3" : String(1.5 + corridor.coverage * 2.5),
      );
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute(
        "stroke",
        corridor.meanFcz === null ? "#a78bfa" : fczColor(corridor.meanFcz, fczRange.lo, fczRange.hi),
      );
      if (corridor.score !== null && corridor.coverage < 1) {
        line.setAttribute("stroke-dasharray", "5 3");
      }
      line.style.cursor = "pointer";
      line.setAttribute("pointer-events", "stroke");
      line.addEventListener("click", () => onSelect({ kind: "corridor", corridor }));
      line.addEventListener("mouseenter", (evt) => {
        const html =
          corridor.score === null
            ? `<b>${corridor.corridorId} — uncharacterized</b>${corridor.sentinelLinks}/${corridor.expectedLinks} links sentinel.`
            : `<b>${corridor.corridorId}</b>score ${formatScore(corridor.score, 3)} · mean fCZ ${formatFidelityPct(corridor.meanFcz, 2)} · ${corridor.validLinks}/${corridor.expectedLinks}`;
        onTooltip({ html, x: (evt as MouseEvent).clientX + 12, y: (evt as MouseEvent).clientY + 12 });
      });
      line.addEventListener("mousemove", (evt) => {
        onTooltip((t) =>
          t ? { ...t, x: (evt as MouseEvent).clientX + 12, y: (evt as MouseEvent).clientY + 12 } : t,
        );
      });
      line.addEventListener("mouseleave", () => onTooltip(null));
      svg.appendChild(line);
    }
  }

  useEffect(() => {
    drawCorridors();
    function onResize() {
      drawCorridors();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCorridors, chipletIds]);

  return (
    <div className="default-radius border-2 border-gray-50 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="block text-md font-semibold text-gray-400">Processor map</h2>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 default-radius bg-green-500" />
            Active
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 default-radius bg-amber-400" />
            Degraded
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 default-radius border border-dashed border-purple-400 bg-purple-100" />
            Sentinel (unmeasured)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 default-radius border border-dashed border-gray-300" />
            Absent
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          Loading topology…
        </div>
      ) : (
        <div className="relative mx-auto max-w-md" ref={mapWrapRef}>
          <svg ref={svgRef} className="absolute inset-0 h-full w-full overflow-visible" style={{ pointerEvents: "none" }} />
          <div
            className="relative grid gap-4 p-3"
            style={{ gridTemplateColumns: `repeat(${CHIPLET_GRID_COLS}, 1fr)` }}
          >
            {chipletIds.map((chipletId) => {
              const chipletQubits = qubitsByChiplet.get(chipletId) ?? [];
              const activeCount = chipletQubits.filter((q) => q.presence !== "absent").length;
              return (
                <div
                  key={chipletId}
                  id={`chip-${chipletId}`}
                  className="relative z-10 cursor-pointer default-radius border border-gray-100 bg-gray-100 p-1.5 hover:border-gray-200 transition-colors duration-300"
                  onClick={() =>
                    chipletQubits[0] && onSelect({ kind: "qubit", qubit: chipletQubits[0] })
                  }
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">{chipletId}</span>
                    <span className="text-xs text-gray-400">
                      {activeCount}/{chipletQubits.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {chipletQubits.map((q) => (
                      <div
                        key={q.qubitIndex}
                        className={`aspect-square default-radius border ${
                          q.presence === "absent"
                            ? STATE_CLASSES.absent.cell
                            : STATE_CLASSES[q.frbSimultaneous.state].cell
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect({ kind: "qubit", qubit: q });
                        }}
                        onMouseEnter={(e) => {
                          const html =
                            q.presence === "absent"
                              ? `<b>q${q.qubitIndex} — ABSENT</b>Not exposed in the ISA.`
                              : `<b>q${q.qubitIndex}</b>fRB (simultaneous): ${formatMetricValue(q.frbSimultaneous, formatFidelityPct)}`;
                          onTooltip({ html, x: e.clientX + 12, y: e.clientY + 12 });
                        }}
                        onMouseMove={(e) =>
                          onTooltip((t) => (t ? { ...t, x: e.clientX + 12, y: e.clientY + 12 } : t))
                        }
                        onMouseLeave={() => onTooltip(null)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
