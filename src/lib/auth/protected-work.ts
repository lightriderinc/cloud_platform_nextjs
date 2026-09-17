import { useEffect } from "react";

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
 * Dirtiness is simply "this field is not empty".
 *
 * It deliberately does NOT compare against `defaultValue`. That was the first
 * version of this check and it never fired once: React keeps a controlled
 * input's `defaultValue` in sync with its `value` prop (react-dom's
 * setDefaultValue -> `node.defaultValue = "" + value`), so `value !==
 * defaultValue` is permanently false for exactly the inputs this exists to
 * protect. The guard looked right, type-checked, and did nothing.
 *
 * The cost of dropping it is that a legitimately pre-filled field also counts
 * as unsaved work, which defers a silent SSO check while it has content. That
 * is the right way to be wrong: a missed redirect delays a session sync by
 * seconds, a missed detection destroys what someone typed.
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
      if (el.value.trim() !== "") return true;
    } else if (el instanceof HTMLTextAreaElement) {
      if (el.value.trim() !== "") return true;
    } else if (el.isContentEditable) {
      if ((el.textContent ?? "").trim() !== "") return true;
    }
  }

  return false;
}

/**
 * React binding for beginProtectedWork(): holds the guard open for as long as
 * `active` is true, and releases it on false or unmount.
 *
 * hasUnsavedInput() already covers the ordinary case of a half-typed form by
 * reading the DOM. This is for work that ISN'T sitting in an input — a review
 * step that has replaced the form with a summary, a multi-stage flow between
 * screens — where there is nothing on the page for the DOM check to find but
 * losing the state would still throw away real work.
 */
export function useProtectedWork(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return beginProtectedWork();
  }, [active]);
}
