"use client";

import { useEffect, useRef } from "react";
import { MdClose } from "react-icons/md";

export default function ModalShell({
  title,
  onClose,
  children,
  maxWidth = "max-w-xl",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  // A click only counts as a backdrop click if the press *started* on the
  // backdrop too. Without this, releasing the mouse outside the panel after a
  // drag that began inside it (e.g. repositioning an image in a cropper, or
  // selecting text) fires a click on the backdrop and closes the modal.
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedOnBackdrop.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`relative default-radius w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-white shadow-xl animate-scale-in p-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center cursor-pointer rounded-full text-lg text-gray-500 hover:text-gray-700"
          >
            <MdClose className="text-lg" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
