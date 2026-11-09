import { useSyncExternalStore } from "react";

/**
 * Progress of the page-load silent SSO check (see @/components/auth/SessionSync),
 * so a signed-out page can show a neutral "checking" state instead of its
 * sign-in prompt while SessionSync may still be about to sign the visitor in
 * from a session on another Light Rider app.
 *
 *  pending     — not decided yet. Every server render reports this, so the
 *                prompt never flashes before the check has had its say.
 *  redirecting — SessionSync navigated to /api/auth/silent-check.
 *  settled     — no check is running; show the real signed-out UI.
 *
 * A module-level store rather than React context: SessionSync and the page's
 * SignInRequired live in unrelated parts of the tree.
 */
export type SilentSsoStatus = "pending" | "redirecting" | "settled";

let status: SilentSsoStatus = "pending";
const listeners = new Set<() => void>();

export function setSilentSsoStatus(next: SilentSsoStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSilentSsoStatus(): SilentSsoStatus {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => "pending",
  );
}
