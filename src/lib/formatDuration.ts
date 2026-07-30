/**
 * Formats the runtime between a job's created/finished timestamps, matching
 * IQM's own dashboard "Runtime" column: decimal seconds under 10s ("1.2s"),
 * whole seconds under a minute ("45s"), minutes+seconds beyond that ("2m 5s").
 * Returns null for missing/invalid input so callers can simply omit the field
 * rather than render a nonsense duration.
 */
export function formatDuration(startIso: string, endIso: string): string | null {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;

  const totalSeconds = (end - start) / 1000;
  if (totalSeconds < 10) return `${totalSeconds.toFixed(1)}s`;
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}
