import { describe, expect, test } from "vitest";
import {
  ABSENT,
  CALIBRATION_ID,
  FRB_SENTINEL,
  loadSynthetic,
  SENTINEL_COUPLERS,
  SOURCE_TIMESTAMP,
  wireEdges,
  wireQubits,
} from "./__fixtures__/syntheticSnapshot";
import { couplersCsv, exportBaseName, qubitsCsv, snapshotJson } from "./exportSnapshot";

interface ExportedMetric {
  value: number | null;
  error: number | null;
  state: string;
  measured_at: string | null;
}
interface ExportedQubit {
  qubit_index: number;
  chiplet_id: string | null;
  lattice_row: number | null;
  lattice_col: number | null;
  presence: string;
  t1_seconds: ExportedMetric;
  t2_star_seconds: ExportedMetric;
  readout_fidelity: ExportedMetric;
  frb_simultaneous: ExportedMetric;
}
interface ExportedCoupler {
  node_a: number;
  node_b: number;
  corridor_id: string | null;
  cz_fidelity: ExportedMetric;
}

/** Minimal RFC 4180 reader, to round-trip what the exporter wrote. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  return rows;
}
const num = (s: string) => (s === "" ? null : Number(s));

const wireQ = wireQubits().data.qubits;
const wireE = wireEdges().data.edges;

async function exported() {
  const { meta, qubits, lattice, edges } = await loadSynthetic();
  return { meta, qubits, lattice, edges };
}

describe("snapshot export", () => {
  test("JSON: metadata, every qubit and coupler, values identical to the API", async () => {
    const { meta, qubits, lattice, edges } = await exported();
    const j = JSON.parse(snapshotJson(meta, lattice, qubits, edges));
    expect(j.format).toBe("lightrider.topology-snapshot");
    expect(j.calibration_id).toBe(CALIBRATION_ID);
    expect(j.snapshot_timestamp).toBe(SOURCE_TIMESTAMP);
    expect(j.lattice).toEqual({ width: 9, height: 3, chiplet_size: 3, chiplet_array_cols: 3, chiplet_array_rows: 1 });
    expect(j.qubits).toHaveLength(wireQ.length);
    expect(j.couplers).toHaveLength(wireE.length);
    for (const r of wireQ) {
      const x = (j.qubits as ExportedQubit[]).find((q) => q.qubit_index === r.qubit_index)!;
      expect(x.t1_seconds).toEqual({ value: r.t1_seconds, error: r.t1_error, state: r.t1_state, measured_at: r.t1_measured_at });
      expect(x.t2_star_seconds).toEqual({ value: r.t2_seconds, error: r.t2_error, state: r.t2_state, measured_at: r.t2_measured_at });
      expect(x.readout_fidelity).toEqual({ value: r.readout_fidelity, error: r.readout_error, state: r.readout_state, measured_at: r.readout_measured_at });
      expect(x.frb_simultaneous).toEqual({
        value: r.frb_simultaneous,
        error: r.frb_simultaneous_error,
        state: r.frb_simultaneous_state,
        measured_at: r.frb_simultaneous_measured_at,
      });
      expect([x.lattice_row, x.lattice_col, x.chiplet_id, x.presence]).toEqual([r.lattice_row, r.lattice_col, r.chiplet_id, r.presence]);
    }
    for (const r of wireE) {
      const x = (j.couplers as ExportedCoupler[]).find((c) => c.node_a === r.node_a && c.node_b === r.node_b)!;
      expect(x.cz_fidelity).toEqual({ value: r.cz_fidelity, error: r.cz_error, state: r.cz_state, measured_at: r.cz_measured_at });
      expect(x.corridor_id).toBe(r.corridor_id);
    }
  });

  test("sentinels export as null + state, never 0.5; raw_values not exported", async () => {
    const { meta, qubits, lattice, edges } = await exported();
    const text = snapshotJson(meta, lattice, qubits, edges);
    const j = JSON.parse(text);
    expect(text).not.toContain("raw_values");
    const sentQ = (j.qubits as ExportedQubit[]).filter((q) => q.frb_simultaneous.state === "sentinel");
    expect(sentQ.map((q) => q.qubit_index)).toEqual(FRB_SENTINEL);
    expect(sentQ.every((q) => q.frb_simultaneous.value === null)).toBe(true);
    const sentE = (j.couplers as ExportedCoupler[]).filter((c) => c.cz_fidelity.state === "sentinel");
    expect(sentE.map((c) => `${c.node_a}-${c.node_b}`)).toEqual(SENTINEL_COUPLERS);
    expect(sentE.every((c) => c.cz_fidelity.value === null && c.cz_fidelity.error === null)).toBe(true);
    const absent = (j.qubits as ExportedQubit[]).find((q) => q.qubit_index === ABSENT[0])!;
    expect(absent.presence).toBe("absent");
    expect(absent.t1_seconds.value).toBeNull();
  });

  test("qubits CSV: header, one row per qubit, round-trips to the API values; nulls empty", async () => {
    const { meta, qubits } = await exported();
    const [h, ...body] = parseCsv(qubitsCsv(meta, qubits));
    expect(body).toHaveLength(wireQ.length);
    expect(h.slice(0, 6)).toEqual(["calibration_id", "qubit_index", "chiplet_id", "lattice_row", "lattice_col", "presence"]);
    expect(h).toContain("t2_star_seconds");
    expect(h).toContain("readout_fidelity_measured_at");
    expect(h).not.toContain("t2_seconds");
    const col = (name: string) => h.indexOf(name);
    for (const r of body) {
      const src = wireQ.find((q) => q.qubit_index === Number(r[col("qubit_index")]))!;
      expect(r[col("calibration_id")]).toBe(CALIBRATION_ID);
      expect(num(r[col("t1_seconds")])).toBe(src.t1_seconds);
      expect(num(r[col("readout_fidelity")])).toBe(src.readout_fidelity);
      expect(num(r[col("frb_simultaneous")])).toBe(src.frb_simultaneous);
      expect(r[col("frb_simultaneous_state")]).toBe(src.frb_simultaneous_state);
      if (src.frb_simultaneous_state === "sentinel") expect(r[col("frb_simultaneous")]).toBe("");
    }
  });

  test("couplers CSV: one row per coupler, round-trips; sentinel cz empty", async () => {
    const { meta, edges } = await exported();
    const [h, ...body] = parseCsv(couplersCsv(meta, edges));
    expect(body).toHaveLength(wireE.length);
    const col = (name: string) => h.indexOf(name);
    for (const r of body) {
      const src = wireE.find((e) => e.node_a === Number(r[col("node_a")]) && e.node_b === Number(r[col("node_b")]))!;
      expect(num(r[col("cz_fidelity")])).toBe(src.cz_fidelity);
      expect(r[col("cz_fidelity_state")]).toBe(src.cz_state);
      expect(r[col("corridor_id")]).toBe(src.corridor_id ?? "");
      expect(r[col("is_inter_chiplet")]).toBe(String(src.is_inter_chiplet));
    }
    const s = body.find((r) => r[col("node_a")] === "24" && r[col("node_b")] === "25")!;
    expect([s[col("cz_fidelity")], s[col("cz_fidelity_error")], s[col("cz_fidelity_state")]]).toEqual(["", "", "sentinel"]);
  });

  test("deterministic: same snapshot -> identical bytes, regardless of input order", async () => {
    const { meta, qubits, lattice, edges } = await exported();
    expect(snapshotJson(meta, lattice, [...qubits].reverse(), [...edges].reverse())).toBe(snapshotJson(meta, lattice, qubits, edges));
    expect(qubitsCsv(meta, [...qubits].reverse())).toBe(qubitsCsv(meta, qubits));
    expect(couplersCsv(meta, [...edges].reverse())).toBe(couplersCsv(meta, edges));
  });

  test("filenames: backend, 12-char calibration id, snapshot source date", async () => {
    const { meta } = await exported();
    expect(exportBaseName(meta)).toBe(`cepheus-1-108q_${CALIBRATION_ID.slice(0, 12)}_20261027`);
    expect(exportBaseName({ ...meta, calibrationId: "sha256:abcdef0123456789", sourceTimestamp: "" })).toBe(
      "cepheus-1-108q_abcdef012345_undated",
    );
  });

  test("CSV escaping", async () => {
    const { meta, qubits } = await exported();
    const text = qubitsCsv(meta, [{ ...qubits[0], chipletId: 'C"1,x' }]);
    expect(text).toContain('"C""1,x"');
    expect(parseCsv(text)[1][2]).toBe('C"1,x');
  });
});
