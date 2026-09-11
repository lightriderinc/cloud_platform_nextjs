export default function ApplicationTag({ tag }: { tag: string }) {
  return (
    <span
      className="rounded px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: "var(--brand-tertiary)" }}
    >
      {tag}
    </span>
  );
}
