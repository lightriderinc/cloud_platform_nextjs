import { blochVector, type Qubit } from "./qubitMath";

const TILT = (25 * Math.PI) / 180;

export default function BlochSphere({
  qubit,
  size = 220,
  className = "",
}: {
  qubit: Qubit;
  size?: number;
  className?: string;
}) {
  const { x, y, z } = blochVector(qubit);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;

  const tipX = cx + r * x;
  const tipY = cy - r * (z * Math.cos(TILT) - y * Math.sin(TILT));

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={`w-full max-w-[280px] ${className}`}
      aria-hidden="true"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="rgba(255,255,255,0.04)"
        stroke="white"
        strokeWidth={1.5}
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={r}
        ry={r * Math.sin(TILT)}
        fill="none"
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={r}
        ry={r * Math.cos(TILT)}
        fill="none"
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="4 3"
      />

      <line
        x1={cx}
        y1={cy - r - 6}
        x2={cx}
        y2={cy + r + 6}
        stroke="#6b7280"
        strokeWidth={1}
      />
      <line
        x1={cx - r - 6}
        y1={cy}
        x2={cx + r + 6}
        y2={cy}
        stroke="#6b7280"
        strokeWidth={1}
      />

      <text x={cx} y={cy - r - 12} textAnchor="middle" fontSize={13} fill="white" className="handwritten">
        |0⟩
      </text>
      <text x={cx} y={cy + r + 22} textAnchor="middle" fontSize={13} fill="white" className="handwritten">
        |1⟩
      </text>
      <text x={cx + r + 14} y={cy + 4} textAnchor="start" fontSize={12} fill="#9ca3af" className="handwritten">
        |+⟩
      </text>
      <text x={cx - r - 14} y={cy + 4} textAnchor="end" fontSize={12} fill="#9ca3af" className="handwritten">
        |−⟩
      </text>

      <line
        x1={cx}
        y1={cy}
        x2={tipX}
        y2={tipY}
        stroke="var(--brand-primary-light)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={tipX} cy={tipY} r={5} fill="var(--brand-primary-light)" />
    </svg>
  );
}
