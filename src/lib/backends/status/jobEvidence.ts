import { db } from "@/lib/billing/db";
import { getQuantumBackendId } from "@/lib/quantum/backends";
import type { JobStatus } from "@/types/job";

// Customer jobs as status evidence (server-only). A job that completed on a
// backend minutes ago is direct proof the backend runs jobs, which is stronger
// than any health flag.
//
// Positive evidence only: QuantumJobSubmission.status/finishedAt are refreshed
// opportunistically when someone opens the job (see api/lr/quantum/jobs/[id]),
// so a missing row proves nothing and is never treated as negative.

const COMPLETED: JobStatus = "COMPLETED";

/**
 * Most recent COMPLETED customer job per catalog backend id (e.g. "iqm.garnet"),
 * among jobs that finished at or after `sinceMs`. Backends without a
 * submission mapping, or without a qualifying job, are absent from the result.
 */
export async function latestCompletedJobs(
  catalogIds: string[],
  sinceMs: number,
): Promise<Map<string, number>> {
  const catalogIdBySubmissionId = new Map<string, string>();
  for (const catalogId of catalogIds) {
    const submissionId = getQuantumBackendId(catalogId);
    if (submissionId) catalogIdBySubmissionId.set(submissionId, catalogId);
  }
  if (catalogIdBySubmissionId.size === 0) return new Map();

  const rows = await db.quantumJobSubmission.groupBy({
    by: ["backend"],
    where: {
      backend: { in: [...catalogIdBySubmissionId.keys()] },
      status: { equals: COMPLETED, mode: "insensitive" },
      finishedAt: { gte: new Date(sinceMs) },
    },
    _max: { finishedAt: true },
  });

  const latest = new Map<string, number>();
  for (const row of rows) {
    const catalogId = catalogIdBySubmissionId.get(row.backend);
    const finishedAt = row._max.finishedAt;
    if (catalogId && finishedAt) latest.set(catalogId, finishedAt.getTime());
  }
  return latest;
}
