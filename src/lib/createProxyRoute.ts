import { NextRequest, NextResponse } from "next/server";

// Builds a GET route handler that forwards /api/<provider>/<path> to an
// upstream base URL, optionally attaching a server-side bearer token so it
// never reaches the browser. Shared by every provider proxy (IQM, Rigetti, ...).
export function createProxyRoute(options: {
  baseUrl: string;
  token?: string;
  /** When true (default), respond 500 if no token is configured. */
  requireToken?: boolean;
}) {
  const { baseUrl, token, requireToken = true } = options;

  return async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
  ) {
    if (requireToken && !token) {
      return NextResponse.json(
        { error: "Upstream API token is not configured on the server." },
        { status: 500 },
      );
    }

    const { path } = await context.params;
    const target = `${baseUrl}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    let upstream: Response;
    try {
      upstream = await fetch(target, { headers, cache: "no-store" });
    } catch {
      return NextResponse.json(
        { error: "Failed to reach upstream API." },
        { status: 502 },
      );
    }

    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  };
}
