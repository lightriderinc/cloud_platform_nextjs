import TopologyExplorer from "@/components/topology/TopologyExplorer";
import { DEFAULT_TOPOLOGY_BACKEND_ID } from "@/lib/topology/client";

// backend_id is a query param, not baked into the route, deliberately — the
// underlying API is /v1/backends/{backend_id}/... (never /v1/cepheus/...)
// so a future non-Cepheus backend can reuse this exact page.
export default async function TopologyPage({
  searchParams,
}: {
  searchParams: Promise<{ backend_id?: string }>;
}) {
  const { backend_id: backendId } = await searchParams;

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Topology</h1>
      <p className="mb-8 text-sm text-gray-600">
        Live chiplet topology, corridor quality, and per-qubit/edge calibration state.
      </p>
      <TopologyExplorer backendId={backendId || DEFAULT_TOPOLOGY_BACKEND_ID} />
    </div>
  );
}
