"use client";

export type CircuitType = "h" | "bell";

interface Props {
  circuit: CircuitType;
  className?: string;
}

const META: Record<CircuitType, { title: string; description: string }> = {
  h: { title: "H Gate", description: "1-qubit superposition" },
  bell: { title: "Bell State", description: "2-qubit entangled pair" },
};

export default function CircuitSchematic({ circuit, className = "" }: Props) {
  const meta = META[circuit];
  return (
    <div
      className={`flex flex-col items-center gap-3 border border-gray-200 bg-gray-100 p-4 ${className}`}
    >
      <p className="text-sm font-bold text-gray-700">
        Circuit Diagram
      </p>
      {circuit === "h" ? <HGateCircuit /> : <BellCircuit />}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">{meta.title}</p>
        <p className="text-xs text-gray-500">{meta.description}</p>
      </div>
    </div>
  );
}

function HGateCircuit() {
  return (
    <svg
      viewBox="0 0 200 64"
      className="w-full max-w-[200px]"
      aria-label="H gate circuit diagram"
    >
      {/* Qubit wire */}
      <line x1="36" y1="32" x2="182" y2="32" stroke="#9ca3af" strokeWidth="1.5" />

      {/* |0⟩ label */}
      <text x="4" y="37" fontSize="11" fontFamily="ui-monospace,monospace" fill="#6b7280">
        |0⟩
      </text>

      {/* H gate box */}
      <rect x="62" y="19" width="30" height="26" rx="4" fill="white" stroke="#d1d5db" strokeWidth="1.5" />
      <text
        x="77"
        y="36"
        fontSize="13"
        fontFamily="ui-monospace,monospace"
        textAnchor="middle"
        fontWeight="700"
        fill="#111827"
      >
        H
      </text>

      {/* Measurement box */}
      <rect x="140" y="19" width="30" height="26" rx="4" fill="white" stroke="#d1d5db" strokeWidth="1.5" />
      {/* Measurement arc */}
      <path d="M 147 38 Q 155 26 163 38" stroke="#4b5563" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Measurement arrow */}
      <line x1="155" y1="32" x2="161" y2="24" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BellCircuit() {
  return (
    <svg
      viewBox="0 0 220 114"
      className="w-full max-w-[220px]"
      aria-label="Bell state circuit diagram"
    >
      {/* Qubit wires */}
      <line x1="36" y1="36" x2="195" y2="36" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1="36" y1="86" x2="195" y2="86" stroke="#9ca3af" strokeWidth="1.5" />

      {/* |0⟩ labels */}
      <text x="4" y="41" fontSize="11" fontFamily="ui-monospace,monospace" fill="#6b7280">
        |0⟩
      </text>
      <text x="4" y="91" fontSize="11" fontFamily="ui-monospace,monospace" fill="#6b7280">
        |0⟩
      </text>

      {/* H gate on top qubit */}
      <rect x="58" y="23" width="30" height="26" rx="4" fill="white" stroke="#d1d5db" strokeWidth="1.5" />
      <text
        x="73"
        y="40"
        fontSize="13"
        fontFamily="ui-monospace,monospace"
        textAnchor="middle"
        fontWeight="700"
        fill="#111827"
      >
        H
      </text>

      {/* CNOT: vertical connecting line (control bottom → target top) */}
      <line x1="138" y1="41" x2="138" y2="74" stroke="#111827" strokeWidth="1.5" />

      {/* CNOT: control dot */}
      <circle cx="138" cy="36" r="5" fill="#111827" />

      {/* CNOT: target circle (white fill covers the line) */}
      <circle cx="138" cy="86" r="12" fill="white" stroke="#111827" strokeWidth="1.5" />

      {/* CNOT: + symbol (vertical from top to bottom of target circle, horizontal across) */}
      <line x1="138" y1="74" x2="138" y2="98" stroke="#111827" strokeWidth="1.5" />
      <line x1="126" y1="86" x2="150" y2="86" stroke="#111827" strokeWidth="1.5" />
    </svg>
  );
}
