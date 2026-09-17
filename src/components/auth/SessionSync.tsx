"use client";

import {
  hasUnsavedInput,
  isProtectedWorkInProgress,
} from "@/lib/auth/protected-work";
import {
  RETURN_CHECK_COOLDOWN_SECONDS,
  SCROLL_RESTORE_MAX_AGE_MS,
  SILENT_SSO_SCROLL_KEY,
  RETURN_FROM_AWAY_MIN_SECONDS,
  SIGNED_IN_LOAD_COOLDOWN_SECONDS,
  SIGNED_OUT_LOAD_COOLDOWN_SECONDS,
  SILENT_SSO_STORAGE_KEY,
  isSilentSsoAllowedPath,
} from "@/lib/auth/silent-sso";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/** How often to re-check auth state while a tab is open and visible. */
const POLL_INTERVAL_MS = 30_000;

/**
 * How long to wait before re-reading auth state to confirm an apparent change.
 * /api/auth/session goes all the way to Logto's userinfo endpoint and reports
 * signed-out on ANY failure, so one dropped request looks identical to a real
 * sign-out. Acting on a single read made a transient blip trigger
 * router.refresh(), and the next poll flip it back — a visible refresh loop
 * during ordinary use. Long enough to outlast a blip, short enough that a
 * genuine sign-out still propagates in about a second.
 */
const CHANGE_CONFIRM_DELAY_MS = 1_500;

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
  // Read through a ref, never a dependency. Depending on `pathname` directly
  // made the sync effect tear down and re-run on every client-side navigation,
  // so each link click cost a userinfo round-trip and could fire the silent
  // check — which reloads the document and lands the user back where they
  // started. Route changes are not a reason to re-check the session.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

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
      // Blanket guard for every ordinary form that never opted in above. A
      // half-typed transfer, lead form or search box is exactly the work this
      // redirect used to destroy, and the cheap /api/auth/session poll keeps
      // running regardless — so all that is deferred here is cross-app
      // propagation, until the field is submitted or cleared.
      if (hasUnsavedInput()) return;
      if (!isSilentSsoAllowedPath(pathnameRef.current)) return;

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

      // The redirect reloads the document, so the browser lands at the top of
      // the page. Record where the user actually was and restore it on the way
      // back — the check is supposed to be invisible, and being thrown to the
      // top of a long page is the most visible thing it did.
      try {
        storage.setItem(
          SILENT_SSO_SCROLL_KEY,
          JSON.stringify({ path: returnTo, y: window.scrollY, at: Date.now() }),
        );
      } catch {
        // Non-fatal: losing the scroll position is better than losing the check.
      }

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
    [],
  );

  /** One read of server-side auth state; null when it could not be determined. */
  const readAuthState = useCallback(async (): Promise<boolean | null> => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) return null;
      const { isAuthenticated, indeterminate } = (await response.json()) as {
        isAuthenticated: boolean;
        indeterminate?: boolean;
      };
      // The server could not reach Logto. That is not a sign-out, and acting
      // on it would re-render the tree under a user who is still signed in.
      if (indeterminate) return null;
      return Boolean(isAuthenticated);
    } catch {
      return null; // Offline or transient — indistinguishable from unknown.
    }
  }, []);

  const syncNow = useCallback(
    async (options: { silentCheckCooldownSeconds: number | null }) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const observed = await readAuthState();
        if (observed === null) return;

        if (observed !== knownAuthenticated.current) {
          // Confirm before acting: router.refresh() re-renders the entire
          // server tree, which the user sees. Never pay that for one blip.
          await new Promise((resolve) =>
            window.setTimeout(resolve, CHANGE_CONFIRM_DELAY_MS),
          );
          const confirmed = await readAuthState();
          if (confirmed !== observed) return; // Disagreed — treat as noise.

          knownAuthenticated.current = observed;
          // Re-render the server tree, layouts included, so the header and
          // sidebars stop disagreeing with the page body.
          router.refresh();
          // State just changed; no need to also bounce through Logto.
          return;
        }

        if (options.silentCheckCooldownSeconds !== null) {
          attemptSilentCheck(options.silentCheckCooldownSeconds);
        }
      } finally {
        inFlight.current = false;
      }
    },
    [router, attemptSilentCheck, readAuthState],
  );

  // Runs before the first paint so the page never visibly starts at the top
  // and jump afterwards.
  useLayoutEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(SILENT_SSO_SCROLL_KEY);
      if (raw) window.sessionStorage.removeItem(SILENT_SSO_SCROLL_KEY);
    } catch {
      return; // Storage unreadable — nothing to restore.
    }
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as { path: string; y: number; at: number };
      const here = `${window.location.pathname}${window.location.search}`;
      // Only restore onto the same page, and only for a position saved by the
      // round-trip we just completed.
      if (saved.path !== here) return;
      if (Date.now() - saved.at > SCROLL_RESTORE_MAX_AGE_MS) return;
      if (typeof saved.y !== "number" || saved.y <= 0) return;
      window.scrollTo(0, saved.y);
    } catch {
      // Malformed entry — already cleared above.
    }
  }, []);

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

      // Coming back after a REAL absence hints the user may have signed in on
      // another platform. A quick glance at another window does not.
      const returnedFromAway = awayMs >= RETURN_FROM_AWAY_MIN_SECONDS * 1000;

      // The redirect's one unique power is signing someone IN from a session
      // created on another platform — which only helps a user who is signed
      // out HERE. For a signed-in user it can only ever confirm what we
      // already know, and this app does not need it to: back-channel logout
      // (RevokedLogtoSession + /api/webhooks/logto) catches a sign-out
      // instantly, and the 30s poll below catches an upstream-revoked token
      // on its own, because getSession's userinfo call fails and reads as
      // signed out. So a signed-in user is never sent on a full-document
      // round trip just for returning to the tab — that reloaded the page
      // they were looking at and swallowed whatever they clicked during it.
      const worthRedirecting = returnedFromAway && !knownAuthenticated.current;

      void syncNow({
        silentCheckCooldownSeconds: worthRedirecting
          ? RETURN_CHECK_COOLDOWN_SECONDS
          : // Still re-checks auth state over the cheap, invisible poll —
            // it just never navigates the document to do it.
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
