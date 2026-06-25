"use client";

import { submitJob } from "@/lib/lr/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";

const CIRCUITS = [
  { value: "h", label: "h gate (1-qubit superposition)" },
  { value: "bell", label: "bell gate (2-qubit entangled pair)" },
];

export default function NewJobModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [circuit, setCircuit] = useState(CIRCUITS[0].value);
  const [shots, setShots] = useState(1000);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => submitJob(circuit, shots),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lr-jobs"] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="New job"
    >
      <div
        className="relative default-radius w-full max-w-md bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Job</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center cursor-pointer rounded-full text-lg text-gray-500 hover:text-gray-700"
          >
            <MdClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Circuit
            </label>
            <select
              value={circuit}
              onChange={(e) => setCircuit(e.target.value)}
              className="default-radius w-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              {CIRCUITS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Shots
            </label>
            <input
              type="number"
              value={shots}
              onChange={(e) =>
                setShots(Math.max(1, parseInt(e.target.value) || 1))
              }
              min={1}
              className="default-radius w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>

          {isError && (
            <p className="text-sm text-red-500">
              Failed to submit job. Please try again.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="default-radius border border-gray-200 px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: "var(--brand-primary)" }}
              className="default-radius px-4 py-2 text-sm font-medium text-white transition-opacity cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Submitting…" : "Submit Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
