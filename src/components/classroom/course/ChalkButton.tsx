import { ReactNode } from "react";

export default function ChalkButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  active = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`handwritten text-lg rounded-lg border-2 px-4 py-1.5 cursor-pointer transition duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-[var(--brand-primary-light)] text-[var(--brand-primary-light)] bg-black/10"
          : "border-gray-200 text-white hover:border-[var(--brand-primary-light)] hover:text-[var(--brand-primary-light)]"
      }`}
    >
      {children}
    </button>
  );
}
