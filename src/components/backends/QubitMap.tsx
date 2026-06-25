"use client";

import { useMemo, useState } from "react";
import type { QubitMapData } from "@/types/backend";
import { computeLayout } from "@/lib/qubitLayout";

// Brand gradient stops, low error -> high error: yellow, orange, red.
const STOPS: [number, number, number][] = [
  [255, 205, 52],
  [242, 103, 57],
  [239, 59, 57],
];

const NO_DATA_STROKE = "#9ca3af"; // gray-400, used for the "no data" outline

function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function errorColor(error: number, min: number, max: number): string {
  const t = max > min ? (error - min) / (max - min) : 0.5;
  return t < 0.5
    ? mix(STOPS[0], STOPS[1], t / 0.5)
    : mix(STOPS[1], STOPS[2], (t - 0.5) / 0.5);
}

// Renders a qubit connectivity map: nodes laid out from the graph, colored by
// per-qubit error using the brand gradient, with a hover tooltip. Qubits the
// API returned no calibration data for render as hollow, dashed-outline nodes
// so they read as intentionally empty rather than broken. Topology-agnostic
// via computeLayout (grid / circle / star / force).
export default function QubitMap({ data }: { data: QubitMapData }) {
  const { nodes, edges, errorLabel } = data;
  const layout = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);
  const [hovered, setHovered] = useState<string | null>(null);

  const errors = nodes
    .map((n) => n.error)
    .filter((e): e is number => e !== undefined);
  const min = errors.length ? Math.min(...errors) : 0;
  const max = errors.length ? Math.max(...errors) : 1;

  const dense = nodes.length > 40;
  const radius = dense ? 16 : 32;
  const showLabels = !dense;
  const V = 1000;

  const hoveredNode = hovered ? nodes.find((n) => n.id === hovered) : null;
  const hoveredPos = hovered ? layout[hovered] : null;

  return (
    <div>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          margin: "0 auto",
          aspectRatio: "1 / 1",
        }}
      >
        <svg
          viewBox={`0 0 ${V} ${V}`}
          width="100%"
          height="100%"
          role="img"
          aria-label="Qubit connectivity map colored by per-qubit error rate"
        >
          {edges.map((e) => {
            const a = layout[e.source];
            const b = layout[e.target];
            if (!a || !b) return null;
            return (
              <line
                key={`${e.source}-${e.target}`}
                x1={a.x * V}
                y1={a.y * V}
                x2={b.x * V}
                y2={b.y * V}
                stroke="rgba(130, 130, 130, 0.45)"
                strokeWidth={dense ? 3 : 5}
              />
            );
          })}
          {nodes.map((n) => {
            const p = layout[n.id];
            if (!p) return null;
            const active = hovered === n.id;
            const hasData = n.error !== undefined;
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={p.x * V}
                  cy={p.y * V}
                  r={radius}
                  fill={
                    hasData
                      ? errorColor(n.error as number, min, max)
                      : "var(--background)"
                  }
                  stroke={
                    active
                      ? "#111827"
                      : hasData
                        ? "rgba(255, 255, 255, 0.85)"
                        : NO_DATA_STROKE
                  }
                  strokeWidth={active ? 4.5 : 3}
                  strokeDasharray={hasData ? undefined : "6 4"}
                />
                {showLabels && (
                  <text
                    x={p.x * V}
                    y={p.y * V}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="22"
                    fill={hasData ? "#fff" : "#6b7280"}
                    stroke={hasData ? "rgba(0, 0, 0, 0.35)" : "none"}
                    strokeWidth="0.9"
                    style={{ paintOrder: "stroke" }}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hoveredNode && hoveredPos && (
          <div
            style={{
              position: "absolute",
              left: `${hoveredPos.x * 100}%`,
              top: `${hoveredPos.y * 100}%`,
              transform: "translate(12px, -50%)",
              pointerEvents: "none",
              background: "var(--background)",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
              zIndex: 10,
            }}
          >
            <div className="font-medium">{hoveredNode.label}</div>
            <div className="text-gray-600">
              {hoveredNode.error !== undefined
                ? `${errorLabel}: ${hoveredNode.error.toFixed(2)} %`
                : "No calibration data"}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          low
          <span
            style={{
              width: 60,
              height: 10,
              borderRadius: 4,
              background: "linear-gradient(90deg, #FFCD34, #F26739, #EF3B39)",
            }}
          />
          high error
        </span>
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              border: `2px dashed ${NO_DATA_STROKE}`,
            }}
          />
          no data
        </span>
      </div>
    </div>
  );
}
