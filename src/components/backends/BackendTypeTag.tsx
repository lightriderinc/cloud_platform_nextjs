import type { BackendType } from "@/types/backend";

// Small pill marking a backend as a QPU or a Simulator.
export default function BackendTypeTag({ type }: { type: BackendType }) {
  return (
    <span className="default-radius bg-gray-200 px-1.5 py-0.5 text-xs text-gray-800">
      {type}
    </span>
  );
}
