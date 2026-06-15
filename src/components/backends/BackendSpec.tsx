// One label/value row inside a backend card (e.g. "Qubits: 64").
// Kept generic so the card can reuse it for every spec.
export default function BackendSpec({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
