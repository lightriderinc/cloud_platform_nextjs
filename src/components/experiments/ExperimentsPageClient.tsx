"use client";

import { handleSignIn } from "@/app/actions/auth";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import QEntropyExperiment from "./QEntropyExperiment";
import type { ExperimentCatalogResponse, ExperimentDef } from "./types";

// q_entropy_refill fills all twelve entropy pools at once from a live
// reservation window -- an operator tool for pool refills, not something
// an ordinary customer runs. Hidden from this dropdown; still fully
// reachable through the API for whoever operates refills.
const INTERNAL_EXPERIMENT_IDS = new Set(["q_entropy_refill"]);

// Every catalog entry gets its own purpose-built UI, not an auto-generated
// form (see this page's own design note) -- this is the dispatch table.
// An id with no entry here still appears in the dropdown once it exists in
// the catalog, but shows a plain "not available yet" message instead of a
// generic form, rather than either hiding it or fabricating a UI for it.
const EXPERIMENT_COMPONENTS: Record<string, (exp: ExperimentDef) => ReactNode> = {
  q_entropy: (exp) => <QEntropyExperiment experimentDef={exp} />,
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; body: T }> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, body };
}

export default function ExperimentsPageClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [catalog, setCatalog] = useState<ExperimentDef[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    apiJson<ExperimentCatalogResponse & { error?: string }>("/api/lr/experiments").then(({ ok, body }) => {
      if (cancelled) return;
      if (!ok) {
        setCatalogError(body.error ?? "Could not load the experiment catalog. Try again later.");
        return;
      }
      const visible = (body.experiments ?? []).filter((e) => !INTERNAL_EXPERIMENT_IDS.has(e.id));
      setCatalog(visible);
      if (visible.length === 1) setSelectedId(visible[0].id);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const selectedExp = useMemo(() => catalog?.find((e) => e.id === selectedId) ?? null, [catalog, selectedId]);

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-gray-600">
        <button type="button" onClick={() => handleSignIn()} className="brand-link cursor-pointer">
          Log in
        </button>{" "}
        to run experiments on Cepheus.
      </p>
    );
  }

  if (catalogError) {
    return <p className="text-sm text-gray-500">{catalogError}</p>;
  }

  if (!catalog) {
    return <p className="text-sm text-gray-500">Loading available experiments…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <label className="block max-w-sm">
        <span className="mb-1 block text-sm font-medium text-gray-700">Experiment</span>
        <select
          className="default-radius w-full border border-gray-200 px-3 py-2 text-sm"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="" disabled>
            Select an experiment…
          </option>
          {catalog.map((exp) => (
            <option key={exp.id} value={exp.id}>
              {exp.label}
            </option>
          ))}
        </select>
      </label>

      {selectedExp && (
        <div className="default-radius border-2 border-gray-50 bg-white p-6">
          {EXPERIMENT_COMPONENTS[selectedExp.id]?.(selectedExp) ?? (
            <p className="text-sm text-gray-500">
              {selectedExp.label} doesn&apos;t have a dedicated UI on this page yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
