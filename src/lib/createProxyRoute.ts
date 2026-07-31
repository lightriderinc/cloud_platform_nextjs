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
//
// Stale-while-revalidate: an expired cache entry is still served immediately
// (as "STALE") while a background refetch updates it for the next request —
// callers only ever block on a live upstream call when there's no cached
// value at all (a genuinely cold entry). This is what actually fixes the
// serverless-cold-start slow-load pattern: the in-memory cache resets to
// empty on every cold start, but the *previous* instance's last-known-good
// response usually hasn't gone stale on the wall clock, so once this cache
// is warm again post-deploy, subsequent cold starts still serve instantly.

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

export function createProxyRoute(options: {
  baseUrl: string;
  token?: string;
  /** When true (default), respond 500 if no token is configured. */
  requireToken?: boolean;
  /** Async provider for auth headers; takes precedence over `token`. */
  authHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  /** If > 0, cache successful (2xx) responses in memory for this many ms. */
  cacheTtlMs?: number;
}) {
  const {
    baseUrl,
    token,
    requireToken = true,
    authHeaders,
    cacheTtlMs = 0,
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
      expires: Date.now() + cacheTtlMs,
      status: upstream.status,
      body,
      contentType,
    };

    if (cacheTtlMs > 0 && upstream.ok) {
      responseCache.set(target, entry);
    }

    return { ok: true, entry };
  }

  function refreshInBackground(target: string) {
    if (refreshInFlight.has(target)) return;
    refreshInFlight.add(target);

    after(async () => {
      try {
        const resolved = await resolveHeaders();
        if ("error" in resolved) return; // auth failure - stale entry stays, retried next request
        await fetchAndCache(target, resolved.headers);
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

    if (cacheTtlMs > 0) {
      const hit = responseCache.get(target);
      if (hit) {
        const isFresh = hit.expires > Date.now();
        if (!isFresh) {
          refreshInBackground(target);
        }
        return new NextResponse(hit.body, {
          status: hit.status,
          headers: {
            "Content-Type": hit.contentType,
            "X-Proxy-Cache": isFresh ? "HIT" : "STALE",
          },
        });
      }
    }

    // No cached value at all (first-ever cold call for this target) - only
    // this path actually blocks on a live upstream fetch.
    const resolved = await resolveHeaders();
    if ("error" in resolved) return resolved.error;

    const result = await fetchAndCache(target, resolved.headers);
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
        ...(cacheTtlMs > 0 ? { "X-Proxy-Cache": "MISS" } : {}),
      },
    });
  };
}
