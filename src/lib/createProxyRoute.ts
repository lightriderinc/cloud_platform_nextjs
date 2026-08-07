import { NextRequest, NextResponse, after } from "next/server";

// Builds a GET route handler that forwards /api/<provider>/<path> to an
// upstream base URL, attaching server-side credentials so they never reach the
// browser. Shared by every provider proxy (IQM, Rigetti, IBM, ...).
//
// Auth is supplied one of two ways:
//   - `token`: a single static bearer token (IQM's model; Rigetti sets
//     requireToken:false to make it optional).
//   - `authHeaders`: an async provider returning the full set of auth headers
//     (e.g. IBM's rotating IAM token + Service-CRN + API-version).
//
// `cacheTtlMs` optionally caches successful responses in memory so repeat loads
// reuse a recent upstream response instead of re-paying slow third-party calls.
// It can be a flat number or a function of the request path, so one proxy can
// cache heavy, slow-changing payloads for longer while keeping a small,
// time-sensitive endpoint nearly live (e.g. IQM's per-machine `health`, whose
// timestamp drives the status badge — caching it too long freezes that
// timestamp and makes healthy machines read as stale).
//
// Stale-while-revalidate: an expired cache entry is still served immediately
// (as "STALE") while a background refetch updates it for the next request —
// callers only ever block on a live upstream call when there's no cached
// value at all (a genuinely cold entry). This is what actually fixes the
// serverless-cold-start slow-load pattern: the in-memory cache resets to
// empty on every cold start, but the *previous* instance's last-known-good
// response usually hasn't gone stale on the wall clock, so once this cache
// is warm again post-deploy, subsequent cold starts still serve instantly.
//
// `maxStaleMs` bounds how long past expiry an entry may still be served STALE
// (default: unbounded, i.e. pure stale-while-revalidate). Set it for endpoints
// whose value decays with wall-clock time so a background refresh that never
// lands (e.g. torn down on serverless) can't replay the same frozen payload
// forever — past the cap the next request blocks on a fresh fetch instead. Like
// `cacheTtlMs`, it can vary per request path.

interface CacheEntry {
  expires: number;
  status: number;
  body: string;
  contentType: string;
}

// Per-process response cache keyed by resolved target URL. Bounded in practice
// by the small, fixed set of backend endpoints we proxy.
const responseCache = new Map<string, CacheEntry>();

// Targets currently being refreshed in the background, so a burst of
// requests hitting the same just-expired entry triggers exactly one upstream
// refetch instead of one per concurrent request.
const refreshInFlight = new Set<string>();

type HeadersResult = { headers: Record<string, string> } | { error: NextResponse };

// A millisecond tuning knob that is either a flat value or derived from the
// request path, letting one proxy treat different endpoints differently.
type PathTuning = number | ((path: string[]) => number);

function resolveTuning(
  option: PathTuning | undefined,
  path: string[],
  fallback: number,
): number {
  if (typeof option === "function") return option(path);
  return option ?? fallback;
}

export function createProxyRoute(options: {
  baseUrl: string;
  token?: string;
  /** When true (default), respond 500 if no token is configured. */
  requireToken?: boolean;
  /** Async provider for auth headers; takes precedence over `token`. */
  authHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  /** If > 0, cache successful (2xx) responses in memory for this many ms.
   *  Pass a function of the request path to vary the TTL per endpoint. */
  cacheTtlMs?: PathTuning;
  /** Max ms past expiry an entry may still be served STALE before a request
   *  blocks on a fresh fetch. Defaults to unbounded (pure SWR). */
  maxStaleMs?: PathTuning;
}) {
  const {
    baseUrl,
    token,
    requireToken = true,
    authHeaders,
    cacheTtlMs,
    maxStaleMs,
  } = options;

  async function resolveHeaders(): Promise<HeadersResult> {
    const headers: Record<string, string> = { Accept: "application/json" };

    if (authHeaders) {
      try {
        Object.assign(headers, await authHeaders());
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error("[proxy] failed to obtain upstream credentials:", detail);
        return {
          error: NextResponse.json(
            { error: "Failed to obtain upstream credentials.", detail },
            { status: 500 },
          ),
        };
      }
    } else {
      if (requireToken && !token) {
        return {
          error: NextResponse.json(
            { error: "Upstream API token is not configured on the server." },
            { status: 500 },
          ),
        };
      }
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    return { headers };
  }

  async function fetchAndCache(
    target: string,
    headers: Record<string, string>,
    ttlMs: number,
  ): Promise<{ ok: true; entry: CacheEntry } | { ok: false; detail: string }> {
    let upstream: Response;
    try {
      upstream = await fetch(target, { headers, cache: "no-store" });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[proxy] failed to reach upstream (${target}):`, detail);
      return { ok: false, detail };
    }

    const body = await upstream.text();
    const contentType = upstream.headers.get("Content-Type") ?? "application/json";
    const entry: CacheEntry = {
      expires: Date.now() + ttlMs,
      status: upstream.status,
      body,
      contentType,
    };

    if (ttlMs > 0 && upstream.ok) {
      responseCache.set(target, entry);
    }

    return { ok: true, entry };
  }

  function refreshInBackground(target: string, ttlMs: number) {
    if (refreshInFlight.has(target)) return;
    refreshInFlight.add(target);

    after(async () => {
      try {
        const resolved = await resolveHeaders();
        if ("error" in resolved) return; // auth failure - stale entry stays, retried next request
        await fetchAndCache(target, resolved.headers, ttlMs);
      } catch (err) {
        console.error(
          `[proxy] background refresh failed (${target}):`,
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        refreshInFlight.delete(target);
      }
    });
  }

  return async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
  ) {
    const { path } = await context.params;
    const target = `${baseUrl}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
    const ttlMs = resolveTuning(cacheTtlMs, path, 0);
    const maxStale = resolveTuning(maxStaleMs, path, Infinity);

    if (ttlMs > 0) {
      const hit = responseCache.get(target);
      if (hit) {
        const staleForMs = Date.now() - hit.expires; // <= 0 while still fresh
        const isFresh = staleForMs <= 0;
        if (isFresh || staleForMs <= maxStale) {
          if (!isFresh) {
            refreshInBackground(target, ttlMs);
          }
          return new NextResponse(hit.body, {
            status: hit.status,
            headers: {
              "Content-Type": hit.contentType,
              "X-Proxy-Cache": isFresh ? "HIT" : "STALE",
            },
          });
        }
        // Too stale to trust - drop it and block on a fresh fetch below.
        responseCache.delete(target);
      }
    }

    // No usable cached value (cold, or dropped as too-stale) - only this path
    // actually blocks on a live upstream fetch.
    const resolved = await resolveHeaders();
    if ("error" in resolved) return resolved.error;

    const result = await fetchAndCache(target, resolved.headers, ttlMs);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Failed to reach upstream API.", detail: result.detail, target },
        { status: 502 },
      );
    }

    return new NextResponse(result.entry.body, {
      status: result.entry.status,
      headers: {
        "Content-Type": result.entry.contentType,
        ...(ttlMs > 0 ? { "X-Proxy-Cache": "MISS" } : {}),
      },
    });
  };
}
