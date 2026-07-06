export default function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex items-center pt-5">
      {steps.map((label, i) => {
        const num = i + 1;
        const isActive = current === num;
        const isDone = current > num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className={[
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors",
                  isDone
                    ? "bg-[var(--brand-primary)] text-white"
                    : isActive
                      ? "border-1 border-[var(--brand-primary)] text-[var(--brand-primary)]"
                      : "border-1 border-gray-200 text-gray-400",
                ].join(" ")}
              >
                {isDone ? (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden="true">
                    <path
                      d="M1 3L3 5L7 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  num
                )}
              </div>
              <span
                className={[
                  "text-xs",
                  isActive ? "text-gray-800" : "text-gray-400",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  "w-8 h-px mx-2 transition-colors",
                  current > num ? "bg-[var(--brand-primary)]" : "bg-gray-200",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
