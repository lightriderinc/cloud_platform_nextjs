"use client";

import CopyButton from "@/components/ui/CopyButton";
import DownloadButton from "@/components/ui/DownloadButton";
import { formatQueueTime } from "@/lib/backends/availability";
import {
  fetchIonqDetails,
  formatCapabilityList,
  formatErrorPercent,
  formatIonqStatus,
  formatMicroseconds,
  formatSeconds,
  formatTopology,
  ionqDetailsFilename,
  parseCharacterizationDate,
  type IonqDetailDevice,
  type IonqDeviceDetails,
} from "@/lib/ionq/details";
import type { Backend } from "@/types/backend";
import { useQuery } from "@tanstack/react-query";

type Row = { label: string; value: string | null | undefined };

const STATUS_LABEL: Record<Backend["status"], string> = {
  online: "Available",
  paused: "Paused",
  offline: "Offline",
  maintenance: "Unavailable",
  unknown: "Unknown",
};

/** Drops rows with no value, so a table never shows an empty cell. */
function present(rows: Row[]): { label: string; value: string }[] {
  return rows.filter((r): r is { label: string; value: string } => r.value != null && r.value !== "");
}

function SpecGrid({ rows }: { rows: Row[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
      {present(rows).map((spec) => (
        <div key={spec.label}>
          <p className="text-xs text-gray-500">{spec.label}</p>
          <p className="mt-1 text-sm text-gray-900">{spec.value}</p>
        </div>
      ))}
    </div>
  );
}

function DetailTable({ rows, caption }: { rows: Row[]; caption: string }) {
  const shown = present(rows);
  if (shown.length === 0) return null;
  return (
    <div className="overflow-x-auto default-radius border border-gray-100">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {shown.map((row) => (
            <tr key={row.label} className="border-b border-gray-100 last:border-0">
              <th scope="row" className="w-48 whitespace-nowrap bg-gray-50 px-4 py-2.5 font-medium text-gray-700">
                {row.label}
              </th>
              <td className="px-4 py-2.5 text-gray-900 break-words">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// IonQ section of the backend detail modal, mirroring IonQ Cloud's system
// page: live specs, the latest characterization (QPUs), capabilities and
// IonQ's raw JSON. Everything comes from /api/ionq/details; if that call
// fails the card's own data is shown with "Details unavailable", never an
// empty or broken modal.
export default function IonqBackendDetails({
  backend,
  device,
}: {
  backend: Backend;
  device: IonqDetailDevice;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ionq-details", device],
    queryFn: () => fetchIonqDetails(device),
    staleTime: 60_000,
    retry: 1,
  });

  const description = data?.description ?? backend.details?.description;
  const queueMs = data?.average_queue_time_ms ?? backend.queueTimeMs ?? null;
  const isSimulator = data ? data.kind === "simulator" : backend.type === "Simulator";

  const specs: Row[] = [
    { label: "Provider", value: backend.providerLabel ?? backend.provider },
    { label: "Qubits", value: String(data?.qubits ?? backend.qubits) },
    { label: "Predicted queue time", value: queueMs === null ? "Unknown" : formatQueueTime(queueMs) },
    {
      label: "Status",
      value:
        formatIonqStatus(data?.status, data?.degraded) ??
        backend.statusInfo?.label ??
        STATUS_LABEL[backend.status],
    },
    { label: "Noise model", value: isSimulator ? (data?.noise_model ?? backend.noiseModel) : null },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs text-gray-500">{data?.backend ?? device}</p>
        {description && <p className="max-w-2xl text-sm leading-relaxed text-gray-600">{description}</p>}
      </div>

      <SpecGrid rows={specs} />

      {isLoading ? (
        <div className="flex animate-pulse flex-col gap-2" aria-label="Loading details">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 default-radius bg-gray-100" />
          ))}
        </div>
      ) : isError || !data ? (
        <p className="default-radius border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500" data-ionq-details-unavailable>
          Details unavailable. Try again later.
        </p>
      ) : (
        <IonqDetailTables details={data} />
      )}
    </div>
  );
}

function IonqDetailTables({ details }: { details: IonqDeviceDetails }) {
  const c = details.characterization;
  const calculatedAt = parseCharacterizationDate(c?.date);
  const caps = details.capabilities;
  const capabilityRows: Row[] = [
    { label: "Supported gates", value: formatCapabilityList(caps?.supported_gates) },
    { label: "Supported native gates", value: formatCapabilityList(caps?.supported_native_gates) },
    { label: "Error mitigation", value: formatCapabilityList(caps?.supported_error_mitigations) },
  ];
  const rawJson = details.raw !== undefined && details.raw !== null ? JSON.stringify(details.raw, null, 2) : null;

  return (
    <>
      {c && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold">Characterization</h2>
            <p className="mt-1 text-xs text-gray-500">Error values represent the 24-hour median.</p>
            {calculatedAt && (
              <p className="text-xs text-gray-500">
                Characterization data calculated at{" "}
                {calculatedAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.
              </p>
            )}
          </div>
          <DetailTable
            caption="Characterization"
            rows={[
              { label: "Topology", value: formatTopology(c.topology, details.qubits) },
              { label: "1Q error", value: formatErrorPercent(c.median_error?.["1q"]) },
              { label: "2Q error", value: formatErrorPercent(c.median_error?.["2q"]) },
              { label: "SPAM error", value: formatErrorPercent(c.median_error?.spam) },
              { label: "T1", value: formatSeconds(c.timing_s?.t1) },
              { label: "T2", value: formatSeconds(c.timing_s?.t2) },
              { label: "1Q gate", value: formatMicroseconds(c.timing_s?.["1q"]) },
              { label: "2Q gate", value: formatMicroseconds(c.timing_s?.["2q"]) },
              { label: "Readout", value: formatMicroseconds(c.timing_s?.readout) },
              { label: "Reset", value: formatMicroseconds(c.timing_s?.reset) },
            ]}
          />
        </section>
      )}

      {present(capabilityRows).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Capabilities</h2>
          <DetailTable caption="Capabilities" rows={capabilityRows} />
        </section>
      )}

      {rawJson && (
        <div className="flex flex-wrap gap-3">
          <CopyButton value={rawJson} label="Copy JSON" />
          <DownloadButton
            value={rawJson}
            filename={ionqDetailsFilename(details.device_instance)}
            mimeType="application/json"
            label="Download JSON"
          />
        </div>
      )}
    </>
  );
}
