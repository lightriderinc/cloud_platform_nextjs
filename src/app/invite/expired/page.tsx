import Link from "next/link";

/**
 * Shown when an invite link can't be used. Kept deliberately vague about the
 * exact reason — see the note in /invite/route.ts.
 */
export default async function InviteExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-gray-700">
        {reason === "expired"
          ? "This invite link has expired."
          : "This invite link isn't valid."}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Ask whoever invited you to send a new one, or sign up directly.
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="default-radius bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Go to Light Rider
        </Link>
      </div>
    </div>
  );
}
