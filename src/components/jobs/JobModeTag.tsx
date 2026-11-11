import { isPaidBackend, isValidBackend } from "@/lib/quantum/backends";

/** "Mock run" for free/unlimited :mock backends, "Live" for real (credit-metered) hardware. */
function resolveMode(backend?: string): "Mock run" | "Live" | null {
  if (!backend || !isValidBackend(backend)) return null;
  // isPaidBackend, not costPerShotCents === 0: per-job priced IonQ Forte QPUs
  // have costPerShotCents 0 but are real hardware.
  return isPaidBackend(backend) ? "Live" : "Mock run";
}

// Small pill marking whether a job ran on a free mock backend or real
// (credit-metered) hardware — same visual convention as BackendTypeTag.
export default function JobModeTag({ backend }: { backend?: string }) {
  const mode = resolveMode(backend);
  if (!mode) return null;

  return (
    <span className="rounded bg-zinc-600 px-2.5 py-0.5 text-xs font-medium text-white">
      {mode}
    </span>
  );
}
