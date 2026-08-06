"use client";

import HintIcon from "@/components/HintIcon";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function ShotsInput({ value, onChange }: Props) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
        Shots
        <HintIcon text="The number of times the circuit is executed. The more shots you use the higher the accuracy of your results." />
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        min={1}
        className="default-radius w-full border border-gray-100 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
      />
    </div>
  );
}
