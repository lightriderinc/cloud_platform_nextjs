type GateName = "AND" | "OR" | "NOT" | "XOR";

const GATE_BODY: Record<GateName, string> = {
  AND: "M65,50 H100 A40,30 0 0 1 100,110 H65 Z",
  OR: "M60,50 Q110,50 150,80 Q110,110 60,110 Q75,80 60,50 Z",
  XOR: "M60,50 Q110,50 150,80 Q110,110 60,110 Q75,80 60,50 Z",
  NOT: "M65,50 L65,110 L150,80 Z",
};

const GATE_TIP_X: Record<GateName, number> = {
  AND: 221,
  OR: 230,
  XOR: 230,
  NOT: 249,
};

const INPUT_X = 28;
const GATE_LEFT_X = 145;
const OUTPUT_X = 352;
const TOP_Y = 50;
const BOTTOM_Y = 110;
const MID_Y = 80;
const INPUT_WIRE_START_X = INPUT_X + 28;
const INPUT_WIRE_MID_X = (INPUT_WIRE_START_X + GATE_LEFT_X) / 2;
const INPUT_WIRE_BEND = 20;

function inputWirePath(y: number, bendTowardCenter: boolean) {
  if (!bendTowardCenter) {
    return `M${INPUT_WIRE_START_X},${y} L${GATE_LEFT_X},${y}`;
  }
  const endY = y < MID_Y ? y + INPUT_WIRE_BEND : y - INPUT_WIRE_BEND;
  return `M${INPUT_WIRE_START_X},${y} L${INPUT_WIRE_MID_X},${y} L${INPUT_WIRE_MID_X},${endY} L${GATE_LEFT_X},${endY}`;
}

const ACTIVE_COLOR = "var(--brand-primary-light)";
const INACTIVE_COLOR = "#9ca3af";

function wireColor(active: boolean) {
  return active ? ACTIVE_COLOR : INACTIVE_COLOR;
}

function bitButtonClass(active: number) {
  return `flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl handwritten cursor-pointer transition duration-150 ${
    active
      ? "border-[var(--brand-primary-light)] bg-emerald-700 text-white"
      : "border-gray-200 bg-black/20 text-gray-200 hover:border-gray-100"
  }`;
}

export default function GateSymbol({
  gate,
  a,
  b,
  inputs,
  output,
  onToggleA,
  onToggleB,
}: {
  gate: GateName;
  a: number;
  b: number;
  inputs: 1 | 2;
  output: number;
  onToggleA: () => void;
  onToggleB: () => void;
}) {
  const tipX = GATE_TIP_X[gate];
  const aY = inputs === 2 ? TOP_Y : MID_Y;

  return (
    <div className="relative h-40 w-[23.75rem] max-w-full">
      <svg
        viewBox="0 0 380 160"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d={inputWirePath(aY, inputs === 2)}
          fill="none"
          stroke={wireColor(a === 1)}
          strokeWidth={3}
        />
        {inputs === 2 && (
          <path
            d={inputWirePath(BOTTOM_Y, true)}
            fill="none"
            stroke={wireColor(b === 1)}
            strokeWidth={3}
          />
        )}
        <g transform={`translate(80, 0)`}>
          {gate === "XOR" && (
            <path
              d={`M48,${TOP_Y} Q63,${MID_Y} 48,${BOTTOM_Y}`}
              fill="none"
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}

          <path
            d={GATE_BODY[gate]}
            fill="none"
            stroke="white"
            strokeWidth={3}
            strokeLinejoin="round"
          />

          {gate === "NOT" && (
            <circle
              cx={160}
              cy={MID_Y}
              r={8}
              fill="none"
              stroke="white"
              strokeWidth={3}
            />
          )}
        </g>

        <line
          x1={tipX}
          y1={MID_Y}
          x2={OUTPUT_X-28}
          y2={MID_Y}
          stroke={wireColor(output === 1)}
          strokeWidth={3}
        />
      </svg>

      <button
        type="button"
        onClick={onToggleA}
        aria-pressed={a === 1}
        aria-label={`Input A, currently ${a}`}
        className={`absolute -translate-x-1/2 -translate-y-1/2 ${bitButtonClass(
          a,
        )}`}
        style={{ left: INPUT_X, top: aY }}
      >
        {a}
      </button>

      {inputs === 2 && (
        <button
          type="button"
          onClick={onToggleB}
          aria-pressed={b === 1}
          aria-label={`Input B, currently ${b}`}
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${bitButtonClass(
            b,
          )}`}
          style={{ left: INPUT_X, top: BOTTOM_Y }}
        >
          {b}
        </button>
      )}

      <div
        className={`absolute -translate-x-1/2 -translate-y-1/2 ${bitButtonClass(
          output,
        ).replace("cursor-pointer", "")}`}
        style={{ left: OUTPUT_X, top: MID_Y }}
      >
        {output}
      </div>
    </div>
  );
}
