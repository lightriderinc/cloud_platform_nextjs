"use client";

import { useEffect, useState } from "react";
import { MdClose, MdMenu } from "react-icons/md";
import SidebarNav from "./sidebar/SidebarNav";

// Below the lg breakpoint, replaces the header user card with a hamburger that
// opens an animated drawer (slide-in panel + backdrop fade) holding the
// sidebar nav and the user card at the bottom.
export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center default-radius transition-colors hover:bg-gray-100"
      >
        <MdMenu className="text-2xl text-gray-700" />
      </button>

      {/* Always mounted so the panel can slide in and out. */}
      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 motion-reduce:transition-none ${
          open ? "bg-black/40" : "pointer-events-none bg-transparent"
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onClick={(event) => event.stopPropagation()}
          className={`flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
            <span className="text-sm font-semibold">Menu</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center default-radius transition-colors hover:bg-gray-100"
            >
              <MdClose className="text-2xl text-gray-700" />
            </button>
          </div>

          <SidebarNav onNavigate={() => setOpen(false)} />

          <div className="border-t border-gray-200 p-3">
            {/* <UserCard className="w-full" /> */}
            <button
              type="button"
              className="default-radius px-3 py-2 text-sm font-semibold text-brand-primary cursor-pointer btn-outline-brand transition-opacity min-w-[110px] w-full"
            >
              Get early access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
