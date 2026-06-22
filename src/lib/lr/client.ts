import type { Job, JobDetail, MeasurementCounts } from "@/types/job";

async function lrFetch(path: string): Promise<Response> {
  const res = await fetch(`/api/lr/${path}`, { cache: "no-store" });
  return res;
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await lrFetch("jobs");
  if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.jobs ?? []);
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
