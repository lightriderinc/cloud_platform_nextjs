/**
 * Bounds for the date-of-birth field.
 *
 * The input was an unconstrained `<input type="date">`, so a birth year in the
 * 1500s saved happily — the browser accepts it, and nothing on the way to
 * Logto's Account API disagreed.
 *
 * Shared by the form and the server action deliberately. The `min`/`max`
 * attributes on a date input are a convenience, not a control: they are
 * trivially bypassed by editing the DOM or calling the action directly, so
 * the same rule has to hold on the server. One module means the two can never
 * drift apart.
 */

/** Nobody alive is older than this. Generous on purpose — it rejects nonsense, not outliers. */
export const MAX_AGE_YEARS = 120;

/** "YYYY-MM-DD", the format `<input type="date">` and the OIDC birthdate claim both use. */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Earliest and latest acceptable dates, as YYYY-MM-DD strings. */
export function birthdateBounds(today: Date = new Date()): {
  min: string;
  max: string;
} {
  const earliest = new Date(today);
  earliest.setFullYear(earliest.getFullYear() - MAX_AGE_YEARS);
  return { min: toISODate(earliest), max: toISODate(today) };
}

/**
 * Returns a user-facing error, or null when the value is acceptable.
 *
 * Compares the raw YYYY-MM-DD strings rather than parsing to Date objects:
 * these are calendar dates with no time or timezone, and `new Date("1999-01-01")`
 * is parsed as UTC midnight, which can land on the previous day for anyone
 * west of Greenwich and reject a birthday that is perfectly valid.
 */
export function validateBirthdate(
  value: string,
  today: Date = new Date(),
): string | null {
  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "Enter a date of birth in YYYY-MM-DD format.";
  }

  const { min, max } = birthdateBounds(today);

  if (trimmed > max) {
    return "Date of birth cannot be in the future.";
  }
  if (trimmed < min) {
    return `Date of birth cannot be earlier than ${min}.`;
  }

  return null;
}
