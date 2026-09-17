const GATE_BODY = {
  AND: "M65,50 H100 A40,30 0 0 1 100,110 H65 Z",
  XOR: "M60,50 Q110,50 150,80 Q110,110 60,110 Q75,80 60,50 Z",
};

const GATE_TIP_X = { AND: 221, XOR: 230 };

const INPUT_X = 28;
const INPUT_WIRE_START_X = INPUT_X + 28;
const GATE_LEFT_X = 145;
const OUTPUT_X = 352;

const XOR_TOP_Y = 40;
const XOR_BOTTOM_Y = 100;
const XOR_MID_Y = 70;
const AND_TOP_Y = 170;
const AND_BOTTOM_Y = 230;
const AND_MID_Y = 200;

const A_Y = (XOR_TOP_Y + AND_TOP_Y) / 2;
const B_Y = (XOR_BOTTOM_Y + AND_BOTTOM_Y) / 2;
const A_BUS_X = 70;
const B_BUS_X = 100;

const GATE_ENTRY_OFFSET = 12;
const XOR_TOP_ENTRY_Y = XOR_TOP_Y + GATE_ENTRY_OFFSET;
const XOR_BOTTOM_ENTRY_Y = XOR_BOTTOM_Y - GATE_ENTRY_OFFSET;
const AND_TOP_ENTRY_Y = AND_TOP_Y + GATE_ENTRY_OFFSET;
const AND_BOTTOM_ENTRY_Y = AND_BOTTOM_Y - GATE_ENTRY_OFFSET;

const ACTIVE_COLOR = "var(--brand-primary-light)";
const INACTIVE_COLOR = "#9ca3af";

function wireColor(active: boolean) {
  return active ? ACTIVE_COLOR : INACTIVE_COLOR;
}

function bitButtonClass(active: number, interactive: boolean) {
  return `flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl handwritten transition duration-150 ${
    interactive ? "cursor-pointer" : ""
  } ${
    active
      ? "border-[var(--brand-primary-light)] bg-emerald-700 text-white"
      : "border-gray-200 bg-black/20 text-gray-200 hover:border-gray-100"
  }`;
}

function branchPath(
  startX: number,
  startY: number,
  busX: number,
  entryY: number,
) {
  return `M${startX},${startY} L${busX},${startY} L${busX},${entryY} L${GATE_LEFT_X},${entryY}`;
}

export default function HalfAdderCircuit({
  a,
  b,
  sum,
  carry,
  onToggleA,
  onToggleB,
}: {
  a: number;
  b: number;
  sum: number;
  carry: number;
  onToggleA?: () => void;
  onToggleB?: () => void;
}) {
  return (
    <div className="relative h-[16.25rem] w-[23.75rem] max-w-full">
      <svg
        viewBox="0 0 380 260"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d={branchPath(INPUT_WIRE_START_X, A_Y, A_BUS_X, XOR_TOP_ENTRY_Y)}
          fill="none"
          stroke={wireColor(a === 1)}
          strokeWidth={3}
        />
        <path
          d={branchPath(INPUT_WIRE_START_X, A_Y, A_BUS_X, AND_TOP_ENTRY_Y)}
          fill="none"
          stroke={wireColor(a === 1)}
          strokeWidth={3}
        />
        <path
          d={branchPath(INPUT_WIRE_START_X, B_Y, B_BUS_X, XOR_BOTTOM_ENTRY_Y)}
          fill="none"
          stroke={wireColor(b === 1)}
          strokeWidth={3}
        />
        <path
          d={branchPath(INPUT_WIRE_START_X, B_Y, B_BUS_X, AND_BOTTOM_ENTRY_Y)}
          fill="none"
          stroke={wireColor(b === 1)}
          strokeWidth={3}
        />

        <g transform="translate(80, -10)">
          <path
            d={`M48,50 Q63,80 48,110`}
            fill="none"
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <path
            d={GATE_BODY.XOR}
            fill="none"
            stroke="white"
            strokeWidth={3}
            strokeLinejoin="round"
          />
        </g>

        <g transform="translate(80, 120)">
          <path
            d={GATE_BODY.AND}
            fill="none"
            stroke="white"
            strokeWidth={3}
            strokeLinejoin="round"
          />
        </g>

        <line
          x1={GATE_TIP_X.XOR}
          y1={XOR_MID_Y}
          x2={OUTPUT_X - 28}
          y2={XOR_MID_Y}
          stroke={wireColor(sum === 1)}
          strokeWidth={3}
        />
        <line
          x1={GATE_TIP_X.AND}
          y1={AND_MID_Y}
          x2={OUTPUT_X - 28}
          y2={AND_MID_Y}
          stroke={wireColor(carry === 1)}
          strokeWidth={3}
        />
      </svg>

      <span
        className="handwritten absolute text-sm text-gray-100"
        style={{ left: 200, top: XOR_MID_Y - 44 }}
      >
        XOR
      </span>
      <span
        className="handwritten absolute text-sm text-gray-100"
        style={{ left: 200, top: AND_MID_Y - 54 }}
      >
        AND
      </span>

      <button
        type="button"
        onClick={onToggleA}
        aria-pressed={a === 1}
        aria-label={`Input A, currently ${a}`}
        disabled={!onToggleA}
        className={`absolute -translate-x-1/2 -translate-y-1/2 ${bitButtonClass(
          a,
          Boolean(onToggleA),
        )}`}
        style={{ left: INPUT_X, top: A_Y }}
      >
        {a}
      </button>
      <span
        className="handwritten absolute -translate-x-1/2 text-sm text-gray-100"
        style={{ left: INPUT_X, top: A_Y - 50 }}
      >
        A
      </span>
      <button
        type="button"
        onClick={onToggleB}
        aria-pressed={b === 1}
        aria-label={`Input B, currently ${b}`}
        disabled={!onToggleB}
        className={`absolute -translate-x-1/2 -translate-y-1/2 ${bitButtonClass(
          b,
          Boolean(onToggleB),
        )}`}
        style={{ left: INPUT_X, top: B_Y }}
      >
        {b}
      </button>
      <span
        className="handwritten absolute -translate-x-1/2 text-sm text-gray-100"
        style={{ left: INPUT_X, top: B_Y + 34 }}
      >
        B
      </span>

      <div
        className={`absolute -translate-x-1/2 -translate-y-1/2 ${bitButtonClass(
          sum,
          false,
        )}`}
        style={{ left: OUTPUT_X, top: XOR_MID_Y }}
      >
        {sum}
      </div>
      <span
        className="handwritten absolute -translate-x-1/2 text-sm text-gray-100"
        style={{ left: OUTPUT_X, top: XOR_MID_Y + 34 }}
      >
        Sum
      </span>

      <div
        className={`absolute -translate-x-1/2 -translate-y-1/2 ${bitButtonClass(
          carry,
          false,
        )}`}
        style={{ left: OUTPUT_X, top: AND_MID_Y }}
      >
        {carry}
      </div>
      <span
        className="handwritten absolute -translate-x-1/2 text-sm text-gray-100"
        style={{ left: OUTPUT_X, top: AND_MID_Y + 34 }}
      >
        Carry
      </span>
    </div>
  );
}
