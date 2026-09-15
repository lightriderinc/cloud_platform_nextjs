// Recent live-mode run_ids, kept client-side.
//
// WHY localStorage and not a server-backed "my runs" list: rigetti-proxy
// exposes no owner-scoped list-runs endpoint. GET /v1/experiments/runs/{id}
// looks up exactly one run by id, and GET /v1/backends/{id}/experiments/status
// only reports each experiment's single most recent run, not a history. So
// there is nothing upstream to fetch "my recent submissions" from -- this
// is the only place that list can currently live. Confirmed against
// rigetti-proxy/server.py and qpu-proxy/app.py during the STEP 0 research
// for this page (2026-08-28); if an owner-scoped list-runs endpoint is ever
// added, this should move server-side and this module can go away.
//
// KNOWN LIMITATION, left deliberately unsolved: a user who clears site
// data or opens this page in a different browser/device loses visibility
// into a run that may still be legitimately QUEUED or EXECUTING on the
// server -- the run itself is completely unaffected, only this client's
// memory of its run_id is gone. There is no recovery path for that today
// short of the user having written the run_id down. Not something to fix
// here; flagged so the next person doesn't have to rediscover it.

const STORAGE_KEY = "lr-experiments-recent-runs";
const MAX_ENTRIES = 20;

export interface RecentRun {
  runId: string;
  experiment: string;
  chipletId: string;
  submittedAt: string;
}

export function loadRecentRuns(): RecentRun[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentRun(entry: RecentRun): RecentRun[] {
  try {
    const next = [entry, ...loadRecentRuns().filter((r) => r.runId !== entry.runId)].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadRecentRuns();
  }
}

export function removeRecentRun(runId: string): RecentRun[] {
  try {
    const next = loadRecentRuns().filter((r) => r.runId !== runId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadRecentRuns();
  }
}
