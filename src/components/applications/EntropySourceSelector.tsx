import { FaMicrochip } from "react-icons/fa";
import {
  MdBlurOn,
  MdCellTower,
  MdDeviceHub,
  MdEqualizer,
  MdHub,
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
      "CSPRNG randomness seeded by the operating system's entropy pool, which draws on CPU hardware sources such as RDSEED.",
    icon: <FaMicrochip />,
    disabled: false,
  },
  {
    id: "curby",
    name: "CURBy",
    description:
      "Certified randomness from CURBy's classical computer entropy generator (quantum beacon temporarily unavailable).",
    icon: <MdDeviceHub />,
    disabled: false,
  },
  {
    id: "iqm-resonance",
    name: "IQM Resonance",
    description:
      "Randomness from a quantum circuit executed on an IQM mock simulator, sampled from qubit measurements.",
    icon: <MdEqualizer />,
    disabled: false,
  },
  {
    id: "drand",
    name: "Drand",
    description:
      "Distributed, publicly verifiable randomness from the League of Entropy. Refreshed every few seconds.",
    icon: <MdHub />,
    disabled: false,
  },
  {
    id: "anu-qrng",
    name: "ANU Quantum RNG",
    description:
      "True quantum randomness measured from quantum vacuum fluctuations at the Australian National University.",
    icon: <MdBlurOn />,
    disabled: false,
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
