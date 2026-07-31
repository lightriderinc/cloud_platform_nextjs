import { QUANTUM_BACKENDS, isValidBackend } from "@/lib/quantum/backends";

/** "Mock run" for free/unlimited :mock backends, "Live" for real (credit-metered) hardware. */
function resolveMode(backend?: string): "Mock run" | "Live" | null {
  if (!backend || !isValidBackend(backend)) return null;
  return QUANTUM_BACKENDS[backend].costPerShotCents === 0 ? "Mock run" : "Live";
}

// Small pill marking whether a job ran on a free mock backend or real
// (credit-metered) hardware — same visual convention as BackendTypeTag.
export default function JobModeTag({ backend }: { backend?: string }) {
  const mode = resolveMode(backend);
  if (!mode) return null;

  return (
    <span className="default-radius bg-gray-500 px-1.5 py-0.5 text-xs font-medium text-white">
      {mode}
    </span>
  );
}
