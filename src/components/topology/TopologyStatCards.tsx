import type { CorridorEntry, EdgeEntry, TopologyEnvelope, TopologyStatusData } from "@/lib/topology/client";
import { formatAgo, formatCalibrationShort, formatNextCheck, formatPct } from "@/lib/topology/format";

const card = "default-radius relative overflow-hidden bg-gray-50 p-4";
const title = "block text-sm font-semibold text-gray-300";
const badge = "mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600";

// TOP STRIP: the answer, most important element on the page.
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
  /** Lowest CZ error among all measured couplers, inside chiplets and between them. */
  bestCoupler: EdgeEntry | null;
  envelope: TopologyEnvelope<unknown> | undefined;
  lastPollAgoSeconds: number | null;
  nextPollEtaSeconds: number | null;
  pollerUnhealthy: boolean;
  pollStatus: TopologyStatusData | undefined;
}) {
  // Same rule as the poller's own STALLED_SOURCE_POLL_THRESHOLD check: the
  // calibration data hasn't changed for that many checks in a row.
  const feedPaused =
    pollStatus?.consecutiveStalledSourcePolls != null &&
    pollStatus.stalledSourcePollThreshold != null &&
    pollStatus.consecutiveStalledSourcePolls >= pollStatus.stalledSourcePollThreshold;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className={card}>
        <p className={title}>Best chiplet link</p>
        <p className="mt-2 block text-xl font-semibold">{topCorridor?.corridorId ?? "None"}</p>
        <p className="mt-1 block text-sm text-gray-500">{topCorridor ? `Score ${formatPct(topCorridor.score)}` : ""}</p>
      </div>
      <div className={card}>
        <p className={title}>Best coupler</p>
        <p className="mt-2 block text-xl font-semibold">
          {bestCoupler ? `q${bestCoupler.nodeA}-q${bestCoupler.nodeB}` : "None"}
        </p>
        <p className="mt-1 block text-sm text-gray-500">
          {bestCoupler?.cz.value != null ? `${formatPct(1 - bestCoupler.cz.value)} CZ error` : ""}
        </p>
      </div>
      <div className={card}>
        {/* When Rigetti last calibrated the chip. "Last checked" below is
            when we last fetched it; the two answer different questions. */}
        <p className={title}>Last calibrated</p>
        <p className="mt-2 block text-xl font-semibold text-gray-900">
          {envelope ? formatAgo(envelope.snapshotAgeSeconds) : "Unknown"}
        </p>
        <p className="mt-1 block text-sm text-gray-500" title="Use this ID to match downloads and runs to this calibration.">
          {envelope ? `Calibration ID ${formatCalibrationShort(envelope.calibrationId)}` : ""}
        </p>
        {envelope?.isStale && <span className={badge}>Out of date</span>}
      </div>
      <div className={card}>
        {/* Our own check of Rigetti's data. A stopped check looks the same
            as a healthy one by calibration age alone; this is the signal. */}
        <p className={title}>Last checked</p>
        <p className="mt-2 block text-xl font-semibold text-gray-900">
          {lastPollAgoSeconds !== null ? formatAgo(lastPollAgoSeconds) : "Unknown"}
        </p>
        <p className="mt-1 block text-sm text-gray-500">
          {nextPollEtaSeconds !== null ? formatNextCheck(nextPollEtaSeconds) : ""}
        </p>
        {feedPaused && (
          <span
            className={`${badge} cursor-help`}
            data-status="feed-paused"
            title={`Rigetti's calibration data has not changed in the last ${pollStatus?.consecutiveStalledSourcePolls} checks.`}
          >
            Data feed paused
          </span>
        )}
        {pollerUnhealthy && (
          <span
            className={`${badge} ml-1 cursor-help`}
            title={
              pollStatus?.pollingEnabled === false
                ? "Automatic checks are turned off."
                : pollStatus?.lastError ?? "The last check did not finish."
            }
          >
            {pollStatus?.pollingEnabled === false ? "Checks off" : "Last check failed"}
          </span>
        )}
      </div>
    </div>
  );
}
