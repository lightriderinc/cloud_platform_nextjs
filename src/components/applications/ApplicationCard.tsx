import TiltCard from "../ui/TiltCard";
import ApplicationTag from "./ApplicationTag";

export default function ApplicationCard({
  title,
  description,
  icon,
  tag,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  tag?: string;
}) {
  return (
    <div>
      <TiltCard className="flex h-full cursor-pointer flex-col gap-3 default-radius bg-gray-100 border border-gray-200 p-4">
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-row gap-4">
            <div>
              {icon &&
                (() => {
                  const Icon = icon;
                  return <Icon className={`text-2xl text-gray-400`} />;
                })()}
            </div>
            <div className="flex flex-col gap-0">
              <h2 className="text-l font-bold">{title}</h2>
              <p className="text-sm text-gray-600 mb-4">{description}</p>
            </div>
          </div>
          {tag && (
            <div className="flex justify-end">
              <ApplicationTag tag={tag} />
            </div>
          )}
        </div>
      </TiltCard>
    </div>
  );
}
