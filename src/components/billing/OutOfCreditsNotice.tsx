import Link from "next/link";

/** Shown in place of a job-submission form when the signed-in user's credit balance can't cover real hardware access. */
export default function OutOfCreditsNotice() {
  return (
    <div className="default-radius border border-dashed border-gray-300 p-6 text-center">
      <p className="text-sm text-gray-700">
        You&apos;re out of Light Rider tokens — buy more to run jobs on real
        quantum hardware.
      </p>
      <Link
        href="/settings/purchases/quantum-compute"
        className="mt-3 inline-block default-radius px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        Buy more tokens
      </Link>
    </div>
  );
}
