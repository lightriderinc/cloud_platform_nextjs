"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProRoleToggle() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (process.env.NODE_ENV === "production") return null;

  const toggle = async (action: "grant" | "revoke") => {
    setLoading(true);
    let failed = false;
    try {
      const res = await fetch("/api/dev/toggle-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        failed = true;
        console.error("toggle-pro failed:", await res.text());
      }
    } catch (e) {
      failed = true;
      console.error("toggle-pro error:", e);
    } finally {
      router.refresh();
      setLoading(false);
      if (failed) alert("Role change may not have applied — check console.");
    }
  };

  return (
    <div className="flex flex-col my-5">
      <p className="mb-5">Dev: Pro role allocation test</p>
      <div className="flex flex-row gap-2">
        <button
          className="flex flex-row gap-2 items-center default-radius cursor-pointer border border-gray-200 pl-3 pr-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 flex-shrink-0"
          disabled={loading}
          onClick={() => toggle("grant")}
        >
          Grant Pro
        </button>
        <button
          className="flex flex-row gap-2 items-center default-radius cursor-pointer border border-gray-200 pl-3 pr-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 flex-shrink-0"
          disabled={loading}
          onClick={() => toggle("revoke")}
          style={{ marginLeft: 8 }}
        >
          Revoke Pro
        </button>
      </div>
    </div>
  );
}
