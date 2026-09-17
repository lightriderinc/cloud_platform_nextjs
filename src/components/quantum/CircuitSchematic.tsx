"use client";

export type CircuitType = "h" | "bell";
export type CircuitSchematicTheme = "light" | "chalk";

interface Props {
  circuit: CircuitType;
  className?: string;
  /** "light" (default) draws a bordered card for a white background, e.g. the submit modal.
   * "chalk" draws bare white-on-transparent strokes meant to sit directly on a ChalkboardPanel. */
  theme?: CircuitSchematicTheme;
}

const META: Record<CircuitType, { title: string; description: string }> = {
  h: { title: "H Gate", description: "1-qubit superposition" },
  bell: { title: "Bell State", description: "2-qubit entangled pair" },
};

// bg-emerald-900, matching ChalkboardPanel — used to "mask" wires behind
// gate/measurement boxes on the chalk theme the same way the light theme
// masks them with a white box fill.
const CHALK_BG = "#064e3b";

interface Colors {
  wire: string;
  label: string;
  boxFill: string;
  boxStroke: string;
  gateLabel: string;
  meter: string;
  controlDot: string;
  connector: string;
  targetFill: string;
}

const THEME_COLORS: Record<CircuitSchematicTheme, Colors> = {
  light: {
    wire: "#9ca3af",
    label: "#6b7280",
    boxFill: "white",
    boxStroke: "#d1d5db",
    gateLabel: "#111827",
    meter: "#4b5563",
    controlDot: "#111827",
    connector: "#111827",
    targetFill: "white",
  },
  chalk: {
    wire: "#9ca3af",
    label: "white",
    boxFill: CHALK_BG,
    boxStroke: "white",
    gateLabel: "white",
    meter: "white",
    controlDot: "white",
    connector: "white",
    targetFill: CHALK_BG,
  },
};

export default function CircuitSchematic({
  circuit,
  className = "",
  theme = "light",
}: Props) {
  const meta = META[circuit];
  const colors = THEME_COLORS[theme];
  const diagram =
    circuit === "h" ? (
      <HGateCircuit colors={colors} />
    ) : (
      <BellCircuit colors={colors} />
    );

  if (theme === "chalk") {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {diagram}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-3 border border-gray-100 bg-gray-100 p-4 ${className}`}
    >
      <p className="text-sm font-bold text-gray-700">Circuit Diagram</p>
      {diagram}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">{meta.title}</p>
        <p className="text-xs text-gray-500">{meta.description}</p>
      </div>
    </div>
  );
}

function HGateCircuit({ colors }: { colors: Colors }) {
  return (
    <svg
      viewBox="0 0 200 64"
      className="w-full max-w-[200px]"
      aria-label="H gate circuit diagram"
    >
      {/* Qubit wire */}
      <line x1="36" y1="32" x2="182" y2="32" stroke={colors.wire} strokeWidth="1.5" />

      {/* |0⟩ label */}
      <text x="4" y="37" fontSize="11" fontFamily="ui-monospace,monospace" fill={colors.label}>
        |0⟩
      </text>

      {/* H gate box */}
      <rect x="62" y="19" width="30" height="26" rx="4" fill={colors.boxFill} stroke={colors.boxStroke} strokeWidth="1.5" />
      <text
        x="77"
        y="36"
        fontSize="13"
        fontFamily="ui-monospace,monospace"
        textAnchor="middle"
        fontWeight="700"
        fill={colors.gateLabel}
      >
        H
      </text>

      {/* Measurement box */}
      <rect x="140" y="19" width="30" height="26" rx="4" fill={colors.boxFill} stroke={colors.boxStroke} strokeWidth="1.5" />
      {/* Measurement arc */}
      <path d="M 147 38 Q 155 26 163 38" stroke={colors.meter} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Measurement arrow */}
      <line x1="155" y1="32" x2="161" y2="24" stroke={colors.meter} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BellCircuit({ colors }: { colors: Colors }) {
  return (
    <svg
      viewBox="0 0 240 114"
      className="w-full max-w-[240px]"
      aria-label="Bell state circuit diagram"
    >
      {/* Qubit wires */}
      <line x1="36" y1="36" x2="220" y2="36" stroke={colors.wire} strokeWidth="1.5" />
      <line x1="36" y1="86" x2="220" y2="86" stroke={colors.wire} strokeWidth="1.5" />

      {/* |0⟩ labels */}
      <text x="4" y="41" fontSize="11" fontFamily="ui-monospace,monospace" fill={colors.label}>
        |0⟩
      </text>
      <text x="4" y="91" fontSize="11" fontFamily="ui-monospace,monospace" fill={colors.label}>
        |0⟩
      </text>

      {/* H gate on top qubit */}
      <rect x="58" y="23" width="30" height="26" rx="4" fill={colors.boxFill} stroke={colors.boxStroke} strokeWidth="1.5" />
      <text
        x="73"
        y="40"
        fontSize="13"
        fontFamily="ui-monospace,monospace"
        textAnchor="middle"
        fontWeight="700"
        fill={colors.gateLabel}
      >
        H
      </text>

      {/* CNOT: vertical connecting line (control bottom → target top) */}
      <line x1="138" y1="41" x2="138" y2="74" stroke={colors.connector} strokeWidth="1.5" />

      {/* CNOT: control dot */}
      <circle cx="138" cy="36" r="5" fill={colors.controlDot} />

      {/* CNOT: target circle (fill covers the line behind it) */}
      <circle cx="138" cy="86" r="12" fill={colors.targetFill} stroke={colors.connector} strokeWidth="1.5" />

      {/* CNOT: + symbol (vertical from top to bottom of target circle, horizontal across) */}
      <line x1="138" y1="74" x2="138" y2="98" stroke={colors.connector} strokeWidth="1.5" />
      <line x1="126" y1="86" x2="150" y2="86" stroke={colors.connector} strokeWidth="1.5" />

      {/* Measurement box, top qubit */}
      <rect x="178" y="23" width="30" height="26" rx="4" fill={colors.boxFill} stroke={colors.boxStroke} strokeWidth="1.5" />
      <path d="M 185 42 Q 193 30 201 42" stroke={colors.meter} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <line x1="193" y1="36" x2="199" y2="28" stroke={colors.meter} strokeWidth="1.5" strokeLinecap="round" />

      {/* Measurement box, bottom qubit */}
      <rect x="178" y="73" width="30" height="26" rx="4" fill={colors.boxFill} stroke={colors.boxStroke} strokeWidth="1.5" />
      <path d="M 185 92 Q 193 80 201 92" stroke={colors.meter} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <line x1="193" y1="86" x2="199" y2="78" stroke={colors.meter} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
