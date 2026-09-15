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

/**
 * Whether the page currently holds text the user typed and has not submitted.
 *
 * The counter above requires each component to opt in, which means anything
 * that forgets to — every ordinary form in the app — still gets wiped by the
 * silent check. This is the blanket version: it asks the DOM directly, so a
 * half-filled form is protected whether or not its author knew this mechanism
 * exists.
 *
 * Dirtiness is `value !== defaultValue`, which for React-controlled inputs
 * (no `defaultValue` attribute rendered) is simply "the user typed something".
 * Deliberately biased toward reporting true: a missed redirect costs a delayed
 * session sync, a false negative costs the user their work.
 */
export function hasUnsavedInput(): boolean {
  if (typeof document === "undefined") return false;

  const fields = document.querySelectorAll<HTMLElement>(
    "input, textarea, [contenteditable='true']",
  );

  for (const el of fields) {
    if (el instanceof HTMLInputElement) {
      // Non-text inputs carry no typed work worth protecting.
      if (["hidden", "submit", "button", "reset", "file"].includes(el.type)) {
        continue;
      }
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked !== el.defaultChecked) return true;
        continue;
      }
      if (el.value.trim() !== "" && el.value !== el.defaultValue) return true;
    } else if (el instanceof HTMLTextAreaElement) {
      if (el.value.trim() !== "" && el.value !== el.defaultValue) return true;
    } else if (el.isContentEditable) {
      if ((el.textContent ?? "").trim() !== "") return true;
    }
  }

  return false;
}
