/**
 * Tracks client-only work that a full-page navigation would destroy — a picked
 * file, a running scan, results on screen — so the silent SSO check can hold
 * off while it exists.
 *
 * That check navigates the whole document, which it must: the OIDC flow needs
 * a genuine top-level navigation. But that also wipes every piece of React
 * state on the page, and staying perfectly current about a session that ended
 * on another platform is never worth destroying the file a user just picked.
 * So while work is registered here, the redirect is skipped outright and the
 * session is re-verified server-side when the work is submitted instead —
 * which is the only check that was ever authoritative.
 *
 * A module-level counter rather than React state or context: SessionSync reads
 * it synchronously at redirect time from outside the React tree, and reading it
 * must never cause a render.
 */
let inProgress = 0;

/** Registers work in progress. Call the returned function to release it. */
export function beginProtectedWork(): () => void {
  inProgress += 1;
  let released = false;
  return () => {
    // Effect cleanups can run more than once; releasing twice would let the
    // counter drift negative and silently disable the guard for the whole tab.
    if (released) return;
    released = true;
    inProgress -= 1;
  };
}

export function isProtectedWorkInProgress(): boolean {
  return inProgress > 0;
}
