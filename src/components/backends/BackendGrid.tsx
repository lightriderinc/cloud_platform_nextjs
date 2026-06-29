import type { Backend } from "@/types/backend";
import BackendCard from "./BackendCard";

// Responsive grid of backend cards: up to 4 columns wide, growing
// downward as the catalog expands (the page itself handles scrolling).
// Cards fade/rise in with a small stagger on mount.
export default function BackendGrid({
  backends,
  onSelect,
}: {
  backends: Backend[];
  onSelect?: (backend: Backend) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {backends.map((backend, index) => (
        <div
          key={backend.id}
          className="h-full animate-fade-in-up motion-reduce:animate-none"
          style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
        >
          <BackendCard backend={backend} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
