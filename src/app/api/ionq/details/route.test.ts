import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";

// Offline only: fetch is stubbed and only answers the fake qpu-proxy host.
const PROXY = "http://qpu-proxy.test";

let upstream: { status: number; body: unknown } = { status: 200, body: {} };
const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
  if (!String(url).startsWith(PROXY)) throw new Error(`test tried to reach ${url}`);
  return Response.json(upstream.body, { status: upstream.status });
});

beforeEach(() => {
  fetchMock.mockClear();
  upstream = { status: 200, body: { device_instance: "forte-1", kind: "qpu", qubits: 36, raw: { id: "qpu.forte-1" } } };
  vi.stubEnv("QUANTUM_PROXY_URL", PROXY);
  vi.stubEnv("QUANTUM_PROXY_SERVICE_KEY", "lr_test");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const get = (device: string) => GET(new Request(`http://app.test/api/ionq/details?device=${encodeURIComponent(device)}`));

describe("GET /api/ionq/details", () => {
  test("passes qpu-proxy's details through, with the service key", async () => {
    const res = await get("forte-1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(upstream.body);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${PROXY}/backends/ionq/forte-1/details`);
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer lr_test");
  });

  test("simulator device ids keep their colon", async () => {
    upstream.body = { device_instance: "ionq:mock", kind: "simulator", characterization: null };
    await get("ionq:mock");
    expect(fetchMock.mock.calls[0][0]).toBe(`${PROXY}/backends/ionq/ionq:mock/details`);
  });

  test("refuses anything but the four IonQ devices, without calling qpu-proxy", async () => {
    for (const device of ["garnet", "../jobs", "forte-1/../../healthz", ""]) {
      expect((await get(device)).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("qpu-proxy error, bad body or unreachable: 502", async () => {
    upstream = { status: 503, body: { detail: "down" } };
    expect((await get("forte-1")).status).toBe(502);
    upstream = { status: 200, body: { nope: true } };
    expect((await get("forte-1")).status).toBe(502);
    fetchMock.mockImplementationOnce(async () => {
      throw new TypeError("fetch failed");
    });
    expect((await get("forte-1")).status).toBe(502);
  });
});
