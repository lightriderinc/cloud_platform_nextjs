"use client";

import { useRef, useState } from "react";

// Generic interactive card surface. On hover it tilts in 3D toward the
// pointer (the side under the cursor dips away, as if the pointer were
// pressing it down), lifts and scales slightly, casts a shadow offset
// toward the raised side, and shows a soft sheen that follows the cursor.
// Honors prefers-reduced-motion by skipping the motion entirely.
// When `onClick` is provided it also behaves as a button (keyboard + roles).

const MAX_TILT = 9; // peak rotation in degrees

const RESET_STYLE: React.CSSProperties = {
  transform: "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
  transition: "transform 300ms ease, box-shadow 300ms ease",
};

export default function TiltCard({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>(RESET_STYLE);
  const [sheen, setSheen] = useState<React.CSSProperties>({ opacity: 0 });

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width; // 0 left -> 1 right
    const py = (event.clientY - rect.top) / rect.height; // 0 top -> 1 bottom

    // The edge nearest the pointer recedes (dips away from the viewer).
    const rotateX = (0.5 - py) * 2 * MAX_TILT; // pointer low -> bottom dips
    const rotateY = (px - 0.5) * 2 * MAX_TILT; // pointer right -> right dips

    // Shadow falls toward the raised side to sell the "weighed down" tilt.
    const shadowX = (0.5 - px) * 22;
    const shadowY = (0.5 - py) * 22 + 14;

    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`,
      boxShadow: `${shadowX}px ${shadowY}px 32px rgba(0, 0, 0, 0.18)`,
      transition: "transform 90ms ease-out, box-shadow 90ms ease-out",
    });
    setSheen({
      opacity: 1,
      background: `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255, 255, 255, 0.28), transparent 45%)`,
    });
  }

  function handlePointerLeave() {
    setStyle(RESET_STYLE);
    setSheen({ opacity: 0 });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={style}
      className={`relative overflow-hidden [transform-style:preserve-3d] ${className}`}
    >
      {children}
      <span
        aria-hidden
        style={sheen}
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
      />
    </div>
  );
}
