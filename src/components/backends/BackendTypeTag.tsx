import type { BackendType } from "@/types/backend";

// Small pill marking a backend as a QPU or a Simulator.
export default function BackendTypeTag({ type }: { type: BackendType }) {
  return (
    <span className="rounded bg-zinc-600 px-2.5 py-0.5 text-xs font-medium text-white">
      {type}
    </span>
  );
}
