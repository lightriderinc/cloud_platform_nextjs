"use client";

import { isProtectedWorkInProgress } from "@/lib/auth/protected-work";
import {
  RETURN_CHECK_COOLDOWN_SECONDS,
  RETURN_FROM_AWAY_MIN_SECONDS,
  SIGNED_IN_LOAD_COOLDOWN_SECONDS,
  SIGNED_OUT_LOAD_COOLDOWN_SECONDS,
  SILENT_SSO_STORAGE_KEY,
  isSilentSsoAllowedPath,
} from "@/lib/auth/silent-sso";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/** How often to re-check auth state while a tab is open and visible. */
const POLL_INTERVAL_MS = 30_000;

type Props = {
  /** Auth state as of the server render, used as the baseline to diff against. */
  initialAuthenticated: boolean;
};

/**
 * Keeps this app's visible auth state in sync with the shared Logto session,
 * with no user interaction. Solves two problems at once:
 *
 * 1. STALE UI. Sign-in/sign-out controls live in the root layout, and Next.js
 *    does not re-render layouts on client-side navigation — so the header
 *    could show "signed in" long after the session ended, while page bodies
 *    correctly showed "Log in". Calling `router.refresh()` re-renders the
 *    whole server tree *including layouts*, which fixes every such component
 *    at once rather than converting each one to a client component.
 *
 * 2. CROSS-APP PROPAGATION. A cheap poll of /api/auth/session catches sessions
 *    killed locally or by back-channel logout. It cannot, however, see a
 *    session that started or ended on a *different* app, because this app's
 *    own cookie is unaffected by that — for those, we fall back to a silent
 *    `prompt=none` redirect (see @/lib/auth/silent-sso for the loop guard).
 */
export default function SessionSync({ initialAuthenticated }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Last state we know the rendered tree reflects. A ref, not state: changing
  // it must never itself cause a render.
  const knownAuthenticated = useRef(initialAuthenticated);
  // Guards against overlapping checks (focus + interval firing together).
  const inFlight = useRef(false);
  // When the tab was last hidden, so we can tell "came back from another app"
  // apart from "clicked around in this tab".
  const awaySince = useRef<number | null>(null);

  /**
   * Guard 1 of the loop protection: only redirect if we can *prove* we
   * recorded the attempt. If sessionStorage is unavailable or the write does
   * not stick, we refuse to run the check at all — falling back to a manual
   * sign-in click is much better than risking a redirect cycle.
   *
   * `cooldownSeconds` differs by trigger: long for the automatic page-load
   * check (the only one that could re-fire unattended), near-zero for a
   * deliberate return to the tab.
   */
  const attemptSilentCheck = useCallback(
    (cooldownSeconds: number) => {
      // Never interrupt work that only exists in the browser. This redirect
      // reloads the document, so firing it here would throw away a selected
      // file or a finished scan; the session is re-checked when that work is
      // submitted instead. See @/lib/auth/protected-work.
      if (isProtectedWorkInProgress()) return;
      if (!isSilentSsoAllowedPath(pathname)) return;

      let storage: Storage;
      try {
        storage = window.sessionStorage;
        const last = Number(storage.getItem(SILENT_SSO_STORAGE_KEY)) || 0;
        if (Date.now() - last < cooldownSeconds * 1000) return;
      } catch {
        return; // Storage unreadable — never attempt.
      }

      const stamp = String(Date.now());
      try {
        storage.setItem(SILENT_SSO_STORAGE_KEY, stamp);
        // Read back: some browsers accept the write and silently discard it.
        if (storage.getItem(SILENT_SSO_STORAGE_KEY) !== stamp) return;
      } catch {
        return; // Could not record the attempt — never attempt.
      }

      const returnTo = `${window.location.pathname}${window.location.search}`;
      // Must be a real document navigation, not router.push(): this route
      // answers with a redirect to Logto (a different origin), and a
      // client-side RSC transition cannot follow that. The OIDC flow also
      // requires a genuine top-level navigation to carry the session cookie.
      //
      // Bare disable (no rule name) on purpose: the rule that fires here,
      // no-location-assign-relative-destination, exists only in the newer
      // eslint-config-next, and naming it breaks lint in the repo on the
      // older one. This file is kept byte-identical across both apps.
      // eslint-disable-next-line
      window.location.assign(
        `/api/auth/silent-check?returnTo=${encodeURIComponent(returnTo)}`,
      );
    },
    [pathname],
  );

  const syncNow = useCallback(
    async (options: { silentCheckCooldownSeconds: number | null }) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;
        const { isAuthenticated } = (await response.json()) as { isAuthenticated: boolean };

        if (isAuthenticated !== knownAuthenticated.current) {
          knownAuthenticated.current = isAuthenticated;
          // Re-render the server tree, layouts included, so the header and
          // sidebars stop disagreeing with the page body.
          router.refresh();
          // State just changed; no need to also bounce through Logto.
          return;
        }

        if (options.silentCheckCooldownSeconds !== null) {
          attemptSilentCheck(options.silentCheckCooldownSeconds);
        }
      } catch {
        // Offline or transient — leave the UI as-is and try again next tick.
      } finally {
        inFlight.current = false;
      }
    },
    [router, attemptSilentCheck],
  );

  useEffect(() => {
    // Automatic page-load check: the strict-cooldown path, since this is the
    // only trigger that could re-fire without the user doing anything.
    void syncNow({
      silentCheckCooldownSeconds: knownAuthenticated.current
        ? SIGNED_IN_LOAD_COOLDOWN_SECONDS
        : SIGNED_OUT_LOAD_COOLDOWN_SECONDS,
    });

    // Only a genuine visibility change counts as being away. Window blur must
    // NOT: a native file picker (and any other OS-level dialog) blurs the
    // window while the tab stays visible, so counting blur as an absence made
    // "spent more than RETURN_FROM_AWAY_MIN_SECONDS choosing a file" look like
    // a return from another platform. That redirected the user mid-task, and
    // an in-progress upload lives only in client state, so it was destroyed.
    const markAway = () => {
      if (awaySince.current === null) awaySince.current = Date.now();
    };

    const onReturn = () => {
      if (document.visibilityState !== "visible") return;

      const awayMs = awaySince.current ? Date.now() - awaySince.current : 0;
      awaySince.current = null;

      // Coming back after being away is the strongest available hint that the
      // user just did something on another platform, so it earns an immediate
      // check. It cannot spin: each one costs a deliberate tab switch, and a
      // redirect round-trip returning here never leaves the tab hidden long
      // enough to qualify.
      const returnedFromAway = awayMs >= RETURN_FROM_AWAY_MIN_SECONDS * 1000;

      void syncNow({
        silentCheckCooldownSeconds: returnedFromAway
          ? RETURN_CHECK_COOLDOWN_SECONDS
          : // Same-tab focus with no real absence: refresh state, but never
            // redirect a user who is actively working here.
            null,
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") markAway();
      else onReturn();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    // Focus still triggers a sync, but with `awaySince` set only by the
    // visibility path it can no longer qualify as a return from away on its
    // own — so regaining focus refreshes state without ever redirecting.
    window.addEventListener("focus", onReturn);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        // Polling never redirects — it only detects locally-visible changes
        // (e.g. back-channel logout). Redirects stay tied to load and return.
        void syncNow({ silentCheckCooldownSeconds: null });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onReturn);
      window.clearInterval(interval);
    };
  }, [syncNow]);

  return null;
}
