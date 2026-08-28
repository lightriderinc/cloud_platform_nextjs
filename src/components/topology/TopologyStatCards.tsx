import type { CorridorEntry, TopologyEnvelope, TopologyStatusData } from "@/lib/topology/client";
import {
  formatAgeShort,
  formatAgoShort,
  formatCalibrationShort,
  formatEtaShort,
  formatFidelityPct,
  formatProvenance,
} from "@/lib/topology/format";

// TOP STRIP — the answer, most important element on the page.
export default function TopologyStatCards({
  topCorridor,
  bestCoupler,
  envelope,
  lastPollAgoSeconds,
  nextPollEtaSeconds,
  pollerUnhealthy,
  pollStatus,
}: {
  topCorridor: CorridorEntry | null;
  bestCoupler: CorridorEntry | null;
  envelope: TopologyEnvelope<unknown> | undefined;
  lastPollAgoSeconds: number | null;
  nextPollEtaSeconds: number | null;
  pollerUnhealthy: boolean;
  pollStatus: TopologyStatusData | undefined;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
      <div className="default-radius relative overflow-hidden bg-gray-50 p-4">
        <p className="block text-sm font-semibold text-gray-300">Best corridor</p>
        <p className="mt-2 block text-xl font-semibold">{topCorridor?.corridorId ?? "—"}</p>
        <p className="mt-1 block text-sm text-gray-500">
          {topCorridor ? `score ${((topCorridor.score as number) * 100).toFixed(2)}%` : "—"}
        </p>
      </div>
      <div className="default-radius relative overflow-hidden bg-gray-50 p-4">
        <p className="block text-sm font-semibold text-gray-300">Best coupler</p>
        <p className="mt-2 block text-xl font-semibold">
          {bestCoupler?.bestLink ? `q${bestCoupler.bestLink[0]}-q${bestCoupler.bestLink[1]}` : "—"}
        </p>
        <p className="mt-1 block text-sm text-gray-500">
          {bestCoupler ? `${formatFidelityPct(bestCoupler.bestLinkFcz, 2)} fCZ` : "—"}
        </p>
      </div>
      <div className="default-radius relative overflow-hidden bg-gray-50 p-4">
        {/* Rigetti's calibration age — not ours. See "Last poll" below for
            our own poller's health; the two answer different questions. */}
        <p className="block text-sm font-semibold text-gray-300">Calibration</p>
        <p className="mt-2 block text-xl font-semibold text-gray-900">
          {envelope ? formatAgeShort(envelope.snapshotAgeSeconds) : "—"}
        </p>
        <p className="mt-1 block text-sm text-gray-500">
          {envelope ? `Rigetti's data · ${formatCalibrationShort(envelope.calibrationId)}` : "—"}
        </p>
        {envelope?.isStale && (
          <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
            Stale snapshot
          </span>
        )}
      </div>
      <div className="default-radius relative overflow-hidden bg-gray-50 p-4">
        {/* Our own poller. A stopped poller looks identical to a healthy
            one via calibration age alone — this is the actual signal. */}
        <p className="block text-sm font-semibold text-gray-300">Last poll</p>
        <p className="mt-2 block text-xl font-semibold text-gray-900">
          {lastPollAgoSeconds !== null ? formatAgoShort(lastPollAgoSeconds) : "—"}
        </p>
        <p className="mt-1 block text-sm text-gray-500">
          {nextPollEtaSeconds !== null ? formatEtaShort(nextPollEtaSeconds) : "—"}
        </p>
        {pollerUnhealthy && (
          <span
            className="mt-1 inline-block cursor-help rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600"
            title={
              pollStatus?.lastError
                ? pollStatus.lastError
                : pollStatus?.pollingEnabled === false
                  ? "Polling is disabled"
                  : "Poll ran but did not succeed — no error message recorded"
            }
          >
            {pollStatus?.pollingEnabled === false ? "Polling disabled" : "Poll failures"}
          </span>
        )}
      </div>
      <div className="default-radius relative overflow-hidden bg-gray-50 p-4">
        <p className="block text-sm font-semibold text-gray-300">Provenance</p>
        <p className="mt-2 block text-xl font-semibold text-gray-900">
          {envelope ? formatProvenance(envelope.topologyProvenance) : "—"}
        </p>
      </div>
    </div>
  );
}
