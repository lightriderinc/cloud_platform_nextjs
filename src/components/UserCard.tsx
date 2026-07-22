// Account button shown in the header on desktop and at the bottom of the
// mobile menu drawer.
export default function UserCard({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 default-radius px-2 py-1.5 text-sm transition-colors hover:bg-gray-100 ${className}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-300">
        LR
      </span>
      Light Rider Inc.
    </button>
  );
}
