"use client";

import { handleSignIn } from "@/app/actions/auth";
import TopologyExplorer from "@/components/topology/TopologyExplorer";
import { DEFAULT_TOPOLOGY_BACKEND_ID } from "@/lib/topology/client";

export default function CepheusTopologyTab({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) {
    return (
      <p className="mt-3 text-sm text-gray-600">
        <button
          type="button"
          onClick={() => handleSignIn()}
          className="brand-link cursor-pointer"
        >
          Log in
        </button>{" "}
        to view topology & calibration data.
      </p>
    );
  }

  return <TopologyExplorer backendId={DEFAULT_TOPOLOGY_BACKEND_ID} />;
}
