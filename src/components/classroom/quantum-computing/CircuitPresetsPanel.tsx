import CircuitSchematic, { type CircuitType } from "@/components/quantum/CircuitSchematic";
import ChalkboardPanel from "../course/ChalkboardPanel";
import RunOnSimulatorButton from "./RunOnSimulatorButton";

const PRESETS: Record<CircuitType, { caption: string; label: string }> = {
  h: {
    caption: "One qubit, one H gate. A quantum coin flip.",
    label: "Run the H gate circuit",
  },
  bell: {
    caption: "Two qubits, H then CNOT. An entangled pair.",
    label: "Run the Bell state circuit",
  },
};

export default function CircuitPresetsPanel({ circuit }: { circuit: CircuitType }) {
  const preset = PRESETS[circuit];

  return (
    <ChalkboardPanel title="Run this on IQM Garnet's simulator">
      <div className="flex flex-col items-center gap-4">
        <CircuitSchematic circuit={circuit} theme="chalk" />
        <p className="handwritten text-white text-center max-w-[220px]">
          {preset.caption}
        </p>
        <RunOnSimulatorButton circuit={circuit} label={preset.label} />
      </div>
    </ChalkboardPanel>
  );
}
