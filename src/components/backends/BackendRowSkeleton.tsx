export default function BackendRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-16 rounded bg-gray-100" />
        </td>
      ))}
    </tr>
  );
}
