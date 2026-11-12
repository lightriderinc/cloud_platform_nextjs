import type { BackendType } from "@/types/backend";

// Small pill marking a backend as a QPU or a Simulator. `label` overrides the
// text where a provider labels its systems differently (IonQ: "Cloud").
export default function BackendTypeTag({ type, label }: { type: BackendType; label?: string }) {
  return (
    <span className="rounded bg-zinc-600 px-2.5 py-0.5 text-xs font-medium text-white">
      {label ?? type}
    </span>
  );
}
