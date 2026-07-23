import { NextRequest, NextResponse } from "next/server";

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

interface CacheEntry {
  expires: number;
  status: number;
  body: string;
  contentType: string;
}

// Per-process response cache keyed by resolved target URL. Bounded in practice
// by the small, fixed set of backend endpoints we proxy.
const responseCache = new Map<string, CacheEntry>();

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

  return async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
  ) {
    const { path } = await context.params;
    const target = `${baseUrl}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

    // Serve a fresh cached response if we have one, skipping auth + upstream.
    if (cacheTtlMs > 0) {
      const hit = responseCache.get(target);
      if (hit && hit.expires > Date.now()) {
        return new NextResponse(hit.body, {
          status: hit.status,
          headers: { "Content-Type": hit.contentType, "X-Proxy-Cache": "HIT" },
        });
      }
    }

    const headers: Record<string, string> = { Accept: "application/json" };

    if (authHeaders) {
      try {
        Object.assign(headers, await authHeaders());
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error("[proxy] failed to obtain upstream credentials:", detail);
        return NextResponse.json(
          { error: "Failed to obtain upstream credentials.", detail },
          { status: 500 },
        );
      }
    } else {
      if (requireToken && !token) {
        return NextResponse.json(
          { error: "Upstream API token is not configured on the server." },
          { status: 500 },
        );
      }
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let upstream: Response;
    try {
      upstream = await fetch(target, { headers, cache: "no-store" });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[proxy] failed to reach upstream (${target}):`, detail);
      return NextResponse.json(
        { error: "Failed to reach upstream API.", detail, target },
        { status: 502 },
      );
    }

    const body = await upstream.text();
    const contentType =
      upstream.headers.get("Content-Type") ?? "application/json";

    if (cacheTtlMs > 0 && upstream.ok) {
      responseCache.set(target, {
        expires: Date.now() + cacheTtlMs,
        status: upstream.status,
        body,
        contentType,
      });
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
        ...(cacheTtlMs > 0 ? { "X-Proxy-Cache": "MISS" } : {}),
      },
    });
  };
}
