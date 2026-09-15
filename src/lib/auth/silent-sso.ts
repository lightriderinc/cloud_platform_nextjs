/**
 * Silent session synchronisation via OIDC `prompt=none`.
 *
 * Apps sharing a Logto tenant each hold their own independent tokens, so one
 * app cannot tell from its own cookie whether the *shared* Logto session is
 * still alive. `prompt=none` asks Logto exactly that, without ever showing a
 * login screen: either it hands back an authorization code (session alive) or
 * it returns `error=login_required` (session gone).
 *
 * This must be a TOP-LEVEL REDIRECT, never a hidden iframe. The iframe variant
 * of this pattern relies on the Logto session cookie being readable in a
 * third-party context, which browsers are actively killing off.
 *
 * ---------------------------------------------------------------------------
 * LOOP GUARD — the dangerous part of this feature
 * ---------------------------------------------------------------------------
 * A signed-out visitor must never bounce to Logto on every page view. Three
 * independent guards, any ONE of which is sufficient to stop a loop:
 *
 *  1. Client marker (primary). Before navigating, the browser records the
 *     attempt in sessionStorage and reads it back to confirm it persisted. If
 *     the write fails or does not stick (private mode, storage disabled,
 *     quota), the client DOES NOT ATTEMPT the check at all. Degrading to
 *     today's manual "Log in" click is strictly better than risking a loop.
 *  2. Server cooldown cookie (secondary). The silent-check route refuses to
 *     contact Logto while this cookie is present, and sets it in the same
 *     response that redirects out. So even a misbehaving or hand-crafted
 *     client cannot spin: the floor is one round-trip per SERVER_COOLDOWN.
 *  3. Path exclusions. The check never fires on the callback or API routes,
 *     so the redirect chain itself can never re-enter the check.
 *
 * Crucially, only the PAGE-LOAD trigger can re-fire itself unattended, so it
 * is the one that carries a long cooldown. Returning to a tab after being away
 * cannot spin — it costs a deliberate tab switch every time — so it is allowed
 * to check almost immediately. That asymmetry is what makes "sign in on the
 * other platform, switch back, and be recognised at once" work without
 * reopening the loop risk.
 *
 * FAILURE MODES, explicitly:
 *  - sessionStorage unavailable  -> no silent check ever runs; manual sign-in
 *                                   still works. No loop.
 *  - Cookies blocked             -> server guard cannot persist, but guard 1
 *                                   still holds. No loop.
 *  - Both unavailable            -> guard 1 fails closed (refuses to attempt).
 *                                   No loop.
 *  - Clock skew / storage wiped mid-flight -> at worst one extra redirect per
 *                                   page load, not an infinite cycle, because
 *                                   the cooldown cookie is set server-side
 *                                   before Logto is ever contacted.
 *
 * The deliberate bias throughout: when in doubt, DON'T redirect.
 */

/**
 * Guard cookie names are namespaced by Logto app id, exactly as the SDK's own
 * `logto_<appId>` cookie is.
 *
 * NOT cosmetic: cookies are scoped by domain and IGNORE the port, so every
 * Light Rider app running on localhost shares one cookie jar. With a fixed
 * name, one app's cooldown suppressed the other app's checks — which looked
 * like sync working intermittently, and cleared up in incognito. Production
 * hosts (platform./pqc.lightriderinc.com) have separate jars and never had the
 * collision, so this only ever bit local development — which is precisely
 * where it did the most damage to trust in the feature.
 */
export function silentSsoCookieName(appId: string): string {
  return `lr_silent_sso_checked_${appId}`;
}

/**
 * Marks that a consent retry has already been attempted (see below), so it can
 * happen at most once per chain and never becomes a cycle.
 */
export function consentRetryCookieName(appId: string): string {
  return `lr_silent_sso_consent_retry_${appId}`;
}

/**
 * Short on purpose. The retry fires about a second after the probe, so this
 * only has to outlive one chain. A long window would block a *legitimate*
 * later retry — e.g. signing in again as a different session shortly after —
 * and strand the user signed out.
 */
export const CONSENT_RETRY_COOLDOWN_SECONDS = 20;

/**
 * Query flag marking the one follow-up request allowed after Logto answers
 * `consent_required`.
 *
 * WHY THIS EXISTS: Logto grants an app's scopes per session. Signing in on one
 * platform creates a session in which only *that* app is granted, so a second
 * platform's `prompt=none` probe comes back `consent_required` ("requested
 * scopes not granted") rather than a code — even though the user is very much
 * signed in. `prompt=none` is forbidden from rendering any UI, so it can never
 * resolve this by itself.
 *
 * Critically, `consent_required` is positive evidence that a session EXISTS
 * (contrast `login_required`, which means there is none). So it is answered
 * with a single retry that omits `prompt=none`, letting the SDK's default
 * `prompt=consent` record the grant. Because the session is already alive this
 * does not re-prompt for credentials; for first-party apps Logto grants without
 * showing anything.
 */
export const CONSENT_RETRY_PARAM = "consent";

/** sessionStorage key holding the timestamp of the last attempt in this tab. */
export const SILENT_SSO_STORAGE_KEY = "lr:silent-sso:last-attempt";

/**
 * Server-side guard window. This is a LOOP breaker, not a rate limit: an
 * automatic redirect cycle completes in well under a second, so a short window
 * is enough to stop one dead, while staying out of the way of a legitimate
 * user-driven re-check. Keeping this short is what lets a returning user be
 * recognised immediately instead of waiting out a long cooldown.
 */
export const SERVER_COOLDOWN_SECONDS = 15;

/**
 * Automatic (page-load) checks for signed-out visitors. This is the only
 * trigger that can re-fire itself without user action, so it carries the
 * strict cooldown — but not a punishing one: a round-trip takes about a
 * second, so this is still ~30x the margin needed to break a cycle, while
 * keeping a deliberate manual refresh responsive.
 */
export const SIGNED_OUT_LOAD_COOLDOWN_SECONDS = 30;

/**
 * Automatic (page-load) checks for signed-in visitors. Rare by design: here a
 * redirect interrupts real work. On Cloud, back-channel logout already catches
 * sign-out instantly; this is the backstop for apps with no revocation store.
 */
export const SIGNED_IN_LOAD_COOLDOWN_SECONDS = 600;

/**
 * How long the tab must have been hidden/blurred before returning to it counts
 * as "you may have been doing something on another platform". Long enough that
 * a redirect round-trip returning to this tab never qualifies, short enough
 * that genuinely switching apps always does.
 */
export const RETURN_FROM_AWAY_MIN_SECONDS = 3;

/**
 * Floor between return-from-away checks. Nearly free, because this trigger
 * cannot spin on its own — it takes a deliberate tab switch each time. It
 * exists only so focus and visibilitychange firing together count once.
 */
export const RETURN_CHECK_COOLDOWN_SECONDS = 5;

/** Route prefixes the silent check must never fire on, to keep redirects acyclic. */
export const SILENT_SSO_EXCLUDED_PREFIXES = ["/callback", "/api/"];

export function isSilentSsoAllowedPath(pathname: string): boolean {
  return !SILENT_SSO_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Constrains the post-check return target to a same-origin absolute path, so
 * `?returnTo=` can never be used to bounce a visitor to another site.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw) return "/";
  // Must be a bare absolute path: rejects "//evil.com" and "https://evil.com".
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (!isSilentSsoAllowedPath(raw)) return "/";
  return raw;
}
