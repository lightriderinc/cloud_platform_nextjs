import type { Job, JobDetail, MeasurementCounts } from "@/types/job";

async function lrFetch(path: string): Promise<Response> {
  const res = await fetch(`/api/lr/${path}`, { cache: "no-store" });
  return res;
}

export async function submitJob(gate: string, shots: number): Promise<Job> {
  const res = await fetch("/api/lr/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gate, shots }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail ?? json.message ?? json.error ?? text;
    } catch {
      // plain text body
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  const raw = await res.json();
  return { ...raw, uuid: raw.uuid ?? raw.job_uuid ?? raw.id };
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await lrFetch("jobs");
  if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.status}`);
  const data = await res.json();
  const raw: Record<string, unknown>[] = Array.isArray(data) ? data : (data.jobs ?? []);
  return raw.map((j) => ({ ...j, uuid: (j.uuid ?? j.job_uuid ?? j.id) as string })) as Job[];
}

export async function fetchJobDetail(id: string): Promise<JobDetail> {
  const res = await lrFetch(`jobs/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch job: ${res.status}`);
  return res.json();
}

export async function fetchJobResult(id: string): Promise<MeasurementCounts | null> {
  const res = await lrFetch(`jobs/${id}/result`);
  if (res.status === 409) return null;
  if (!res.ok) throw new Error(`Failed to fetch result: ${res.status}`);
  const data = await res.json();
  return data.counts ?? data.measurement_counts ?? data;
}
