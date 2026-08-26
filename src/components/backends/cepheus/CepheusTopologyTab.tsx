import TopologyExplorer from "@/components/topology/TopologyExplorer";
import { DEFAULT_TOPOLOGY_BACKEND_ID } from "@/lib/topology/client";

export default function CepheusTopologyTab() {
  return <TopologyExplorer backendId={DEFAULT_TOPOLOGY_BACKEND_ID} />;
}
