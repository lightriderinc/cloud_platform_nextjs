"use client";

import ApiTokenCard from "@/components/overview/ApiTokenCard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MdAutorenew, MdDeleteOutline } from "react-icons/md";

type StoredApiKey = {
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  rotatedAt: string | null;
};

async function fetchApiKey(): Promise<StoredApiKey | null> {
  const res = await fetch("/api/settings/tokens");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.apiKey;
}

async function postJson(url: string): Promise<{ key: string; keyPrefix: string }> {
  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export default function AccessTokensPanel() {
  const queryClient = useQueryClient();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"rotate" | "revoke" | null>(null);

  const { data: apiKey, isLoading } = useQuery({
    queryKey: ["settings", "api-key"],
    queryFn: fetchApiKey,
  });

  const generate = useMutation({
    mutationFn: () => postJson("/api/settings/tokens"),
    onSuccess: (data) => {
      setRevealedKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["settings", "api-key"] });
    },
  });

  const rotate = useMutation({
    mutationFn: () => postJson("/api/settings/tokens/rotate"),
    onSuccess: (data) => {
      setRevealedKey(data.key);
      setConfirming(null);
      queryClient.invalidateQueries({ queryKey: ["settings", "api-key"] });
    },
  });

  const revoke = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/tokens", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      setRevealedKey(null);
      setConfirming(null);
      queryClient.invalidateQueries({ queryKey: ["settings", "api-key"] });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  const error = generate.error ?? rotate.error ?? revoke.error;

  return (
    <div className="flex flex-col gap-4">
      {revealedKey && (
        <div className="default-radius border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Copy your key now — it won&apos;t be shown again.
          </p>
          <div className="mt-3">
            <ApiTokenCard token={revealedKey} />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
      )}

      {!apiKey && (
        <div className="default-radius border border-gray-200 border-dashed bg-gray-50 p-4">
          <p className="mb-3 text-sm text-gray-600">
            No API key yet. Generate one to authenticate SDK requests.
          </p>
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="default-radius px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {generate.isPending ? "Generating…" : "Generate API Key"}
          </button>
        </div>
      )}

      {apiKey && (
        <div className="default-radius border border-gray-50 bg-gray-50 p-4">
          <p className="font-mono text-sm text-gray-800">
            {apiKey.keyPrefix}
            {"•".repeat(16)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Created: {new Date(apiKey.createdAt).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            Last used:{" "}
            {apiKey.lastUsedAt
              ? new Date(apiKey.lastUsedAt).toLocaleString()
              : "never"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {confirming === "rotate" ? (
              <>
                <span className="text-sm text-gray-600">
                  This immediately invalidates the current key.
                </span>
                <button
                  type="button"
                  onClick={() => rotate.mutate()}
                  disabled={rotate.isPending}
                  className="default-radius border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                >
                  {rotate.isPending ? "Rotating…" : "Confirm rotate"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="default-radius border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Cancel
                </button>
              </>
            ) : confirming === "revoke" ? (
              <>
                <span className="text-sm text-gray-600">
                  This deletes the key entirely.
                </span>
                <button
                  type="button"
                  onClick={() => revoke.mutate()}
                  disabled={revoke.isPending}
                  className="default-radius border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                >
                  {revoke.isPending ? "Revoking…" : "Confirm revoke"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="default-radius border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirming("rotate")}
                  className="flex items-center gap-1.5 default-radius border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 cursor-pointer"
                >
                  <MdAutorenew /> Rotate key
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming("revoke")}
                  className="flex items-center gap-1.5 default-radius border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 cursor-pointer"
                >
                  <MdDeleteOutline /> Revoke
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
