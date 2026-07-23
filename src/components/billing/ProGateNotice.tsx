import Link from "next/link";

/** Shown in place of a job-submission form when the signed-in user isn't Pro. */
export default function ProGateNotice() {
  return (
    <div className="default-radius border border-dashed border-gray-300 p-6 text-center">
      <p className="text-sm text-gray-700">
        Upgrade to Pro to run jobs on real quantum hardware.
      </p>
      <Link
        href="/pricing/user-plans"
        className="mt-3 inline-block default-radius px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        View Pro plan
      </Link>
    </div>
  );
}
