/**
 * Carrying expected failures out of a Server Action.
 *
 * THE PROBLEM. Next.js sanitizes any error a Server Action throws in a
 * production build: the client receives a generic "An error occurred in the
 * Server Components render… a digest property is included" message, and the
 * real text is discarded. That is correct for unexpected faults — a stack
 * trace or a DB error must never reach a browser — but it also swallowed the
 * messages users actually need, so "Incorrect account or password" rendered as
 * a framework error inside the Change Password dialog, with a 500 in the logs.
 * It worked in development, where Next does not sanitize, which is exactly why
 * it survived review.
 *
 * THE RULE. An expected failure is a RETURN VALUE, never a throw. Only genuine
 * faults throw, and those keep the sanitized treatment they deserve.
 *
 * `attempt()` runs inside the action, on the server. `unwrap()` runs in the
 * client component and re-throws the real message locally — so existing
 * `try { … } catch (e) { setError(e.message) }` call sites keep working as
 * written, with no change to how errors are displayed.
 */

export type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

/**
 * Runs a server-side operation and converts a thrown error into a returned
 * failure, so its message survives the Server Action boundary.
 *
 * `fallbackMessage` is used when the thrown value carries nothing useful; it
 * should read as something a user can act on, not as a status code.
 */
export async function attempt<T>(
  fn: () => Promise<T>,
  fallbackMessage = "Something went wrong. Please try again.",
): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim() !== ""
        ? err.message
        : fallbackMessage;
    // Logged server-side so a real fault is still diagnosable, even though the
    // user only ever sees `message`.
    console.error("[action] failed:", err);
    return { ok: false, message };
  }
}

/**
 * Unpacks a result in a client component, throwing the real message so the
 * caller's existing catch block can surface it.
 */
export function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.value;
  throw new Error(result.message);
}
