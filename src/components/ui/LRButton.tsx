import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type LRButtonVariant =
  | "primary"
  | "primary-outline"
  | "secondary"
  | "secondary-outline";

export interface LRButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LRButtonVariant;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const baseClasses =
  "inline-flex items-center justify-center default-radius text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-all duration-200 ease-in-out";

const variantClasses: Record<LRButtonVariant, string> = {
  primary:
    "bg-[var(--brand-primary)] border border-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-light)] hover:border-[var(--brand-primary-light)] focus-visible:ring-[var(--brand-primary)]",
  "primary-outline":
    "bg-transparent font-semibold text-[var(--brand-primary)] border border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 focus-visible:ring-[var(--brand-primary)]",
  secondary:
    "bg-gray-700 text-white border border-gray-700 hover:bg-gray-500 hover:border-gray-500 focus-visible:ring-gray-400",
  "secondary-outline":
    "bg-transparent text-gray-800 font-semibold border border-gray-400 hover:bg-gray-200/50 focus-visible:ring-gray-400",
};

const LRButton = forwardRef<HTMLButtonElement, LRButtonProps>(function LRButton(
  {
    variant = "primary",
    icon,
    iconPosition = "left",
    className,
    children,
    ...props
  },
  ref,
) {
  const paddingClasses = icon
    ? children
      ? iconPosition === "right"
        ? "pl-4 pr-3 gap-2"
        : "pl-3 pr-4 gap-2"
      : "px-3"
    : "px-4";

  const classes = [
    baseClasses,
    variantClasses[variant],
    "py-2",
    paddingClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} className={classes} {...props}>
      {icon && iconPosition === "left" && (
        <span className="inline-flex shrink-0 items-center">{icon}</span>
      )}
      {children}
      {icon && iconPosition === "right" && (
        <span className="inline-flex shrink-0 items-center">{icon}</span>
      )}
    </button>
  );
});

export default LRButton;
