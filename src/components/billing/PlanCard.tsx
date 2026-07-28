"use client";


export default function PlanCard({
  name,
  price,
  billedNote,
  description,
  features,
  badge,
  action,
  selected,
  onSelect,
}: {
  name: string;
  price: string;
  billedNote?: string;
  description?: string;
  features: string[];
  badge?: string;
  action: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex flex-col gap-4 default-radius border bg-gray-100 p-5 ${
        selected
          ? "border-gray-100 card-hover-primary"
          : "border-gray-100 card-hover-primary"
      }`}
    >
      {badge && (
        <span className="w-fit default-radius px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: "var(--brand-tertiary)" }}>
          {badge}
        </span>
      )}
      <div>
        <h3 className="text-lg font-bold text-gray-800">{name}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      <div>
        <span className="text-3xl font-bold text-gray-900">{price}</span>
        {billedNote && (
          <span className="ml-1 text-sm text-gray-500">{billedNote}</span>
        )}
      </div>
      <ul className="flex flex-1 flex-col gap-2 text-sm text-gray-700">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {/* Stop clicks on the CTA from also toggling card selection twice */}
      <div onClick={(e) => e.stopPropagation()}>{action}</div>
    </div>
  );
}
