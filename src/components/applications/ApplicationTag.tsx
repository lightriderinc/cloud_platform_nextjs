export default function ApplicationTag({ tag }: { tag: string }) {
  return (
    <span
      className="default-radius px-1.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: "var(--brand-tertiary)" }}
    >
      {tag}
    </span>
  );
}
