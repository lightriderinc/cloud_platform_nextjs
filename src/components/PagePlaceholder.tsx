export default function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mb-6 text-sm text-gray-600">{description}</p>

      <div className="rounded border border-dashed border-gray-300 p-16 text-center text-sm text-gray-500">
        Under construction
      </div>
    </div>
  );
}
