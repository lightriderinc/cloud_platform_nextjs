"use client";

import { useMemo, useState } from "react";
import { base64ToBytes, bytesToHexPreview, copyFullHex, downloadBytes } from "./bitStream";
import { DetailRow } from "./DetailRow";
import type { ChipletStream, EntropyPoolEntry } from "./types";

/**
 * One withdrawn stream's card -- raw bits are decoded once (base64 ->
 * bytes) and never rendered bit-by-bit; only a short hex preview is shown
 * on screen. `poolSnapshot` is the /entropy/pools entry captured for this
 * chiplet BEFORE the withdrawal request, used only to show calibration/
 * refill context -- see the note below on why it's approximate, not exact.
 */
export default function ChipletStreamCard({
  stream,
  poolSnapshot,
  label,
}: {
  stream: ChipletStream;
  poolSnapshot?: EntropyPoolEntry;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const bytes = useMemo(() => base64ToBytes(stream.data_base64), [stream.data_base64]);
  const hexPreview = useMemo(() => bytesToHexPreview(bytes), [bytes]);

  return (
    <div className="default-radius bg-gray-50 p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-base font-semibold text-gray-900">{label ?? stream.chiplet_id}</span>
        <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-2xs font-medium text-green-700">
          Withdrawn
        </span>
      </div>

      <DetailRow label="Bits" value={stream.bits.toLocaleString()} />
      {poolSnapshot && (
        // The withdraw response itself carries no per-withdrawal calibration
        // or generation timestamp (rigetti-proxy's _chiplet_stream_json only
        // returns chiplet_id/bits/data_base64/withdrawal_id) -- this is the
        // pool's own aggregate calibration range and last refill time,
        // captured just before the withdrawal, not necessarily the exact
        // calibration under which these specific bits were generated if the
        // pool spans more than one refill. Labeled as pool context, not an
        // exact per-withdrawal provenance record.
        <>
          <DetailRow
            label="Pool calibration"
            value={
              <>
                {poolSnapshot.oldest_calibration_id?.slice(0, 12) ?? "—"}
                {poolSnapshot.newest_calibration_id && poolSnapshot.newest_calibration_id !== poolSnapshot.oldest_calibration_id
                  ? `–${poolSnapshot.newest_calibration_id.slice(0, 12)}`
                  : ""}
              </>
            }
          />
          <DetailRow
            label="Last refilled"
            value={poolSnapshot.last_refill_at ? new Date(poolSnapshot.last_refill_at).toLocaleString() : "unknown"}
          />
        </>
      )}

      <div className="mt-3 default-radius border border-gray-100 bg-white p-2 font-mono text-[11px] break-all text-gray-600">
        {hexPreview}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => downloadBytes(bytes, `${stream.chiplet_id}-${stream.withdrawal_id ?? "combined"}.bin`)}
          className="default-radius cursor-pointer border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Download .bin
        </button>
        <button
          type="button"
          onClick={() =>
            copyFullHex(bytes).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
          className="default-radius cursor-pointer border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          {copied ? "Copied" : "Copy as hex"}
        </button>
      </div>
    </div>
  );
}
