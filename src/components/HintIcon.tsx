"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdInfoOutline } from "react-icons/md";

const VIEWPORT_MARGIN = 8;
const GAP = 6;

/**
 * Small "ⓘ" affordance for a short tooltip next to a specific non-obvious
 * field. Use sparingly — not decoration for every label.
 *
 * Renders the bubble through a portal with viewport-clamped fixed
 * positioning so it can't get clipped by a scrollable/overflow-hidden
 * ancestor (e.g. a modal body) or spill off the edge of the screen.
 */
export default function HintIcon({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open) return;

    function reposition() {
      const button = buttonRef.current;
      const tooltip = tooltipRef.current;
      if (!button || !tooltip) return;
      const buttonRect = button.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const centeredLeft =
        buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2;
      const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN;
      setPos({
        top: buttonRect.top - tooltipRect.height - GAP,
        left: Math.min(Math.max(centeredLeft, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN)),
      });
    }

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={text}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center text-xs leading-none text-gray-400 transition-colors hover:text-gray-600"
      >
        <MdInfoOutline />
      </button>
      {open &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
            }}
            className="z-50 w-max max-w-56 default-radius bg-gray-800 px-2 py-1 text-xs text-white shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
