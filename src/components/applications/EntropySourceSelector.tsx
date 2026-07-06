import { FaMicrochip } from "react-icons/fa";
import {
  MdBrightness7,
  MdCellTower,
  MdDeviceHub,
  MdEqualizer,
} from "react-icons/md";
import EntropySourceCard from "@/components/dashboard/EntropySourceCard";

const SOURCES = [
  {
    id: "nist-beacon",
    name: "NIST Beacon",
    description:
      "Publicly verifiable random values from the National Institute of Standards and Technology.",
    icon: <MdCellTower />,
    disabled: false,
  },
  {
    id: "rdseed",
    name: "RDSEED",
    description:
      "Hardware entropy sourced directly from the CPU's on-chip entropy generator.",
    icon: <FaMicrochip />,
    disabled: false,
  },
  {
    id: "curby",
    name: "CURBy",
    description: "Certified Unique Randomness from quantum hardware.",
    icon: <MdDeviceHub />,
    disabled: true,
  },
  {
    id: "iqm-resonance",
    name: "IQM Resonance",
    description:
      "Entropy extracted from IQM quantum processor resonance measurements.",
    icon: <MdEqualizer />,
    disabled: true,
  },
  {
    id: "quantum-light-lab",
    name: "Quantum Light Lab",
    description:
      "Photonic quantum random number generation from light source measurements.",
    icon: <MdBrightness7 />,
    disabled: true,
  },
];

export { SOURCES };

export default function EntropySourceSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SOURCES.map((source) => (
        <EntropySourceCard
          key={source.id}
          id={source.id}
          name={source.name}
          description={source.description}
          icon={source.icon}
          selected={selectedId === source.id}
          disabled={source.disabled}
          onSelect={() => onSelect(source.id)}
        />
      ))}
    </div>
  );
}
