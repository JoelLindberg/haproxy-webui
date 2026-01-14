import { NextResponse } from "next/server";
import { callDataplane, fetchBackendServers } from "@/services/haproxy";
import { ensureAuthenticated } from "@/lib/serverAuth";

/**
 * GET /api/haproxy?path=/v3/health
 * Proxies requests to the HAProxy Data Plane API.
 * - `path` query param is appended to the configured base URL (default: /v3/health).
 *
 * Additional behavior:
 * - If `backend` query param is provided, returns status (and optional health) for all servers in that backend.
 *   - `health` query param (true/false or 1/0) controls whether health/check fields are included.
 */
export async function GET(req: Request) {
  // enforce auth
  const auth = ensureAuthenticated(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "/v3/health";

  // If backend param is present, use the helper to fetch servers' status (and optional health)
  const backend = url.searchParams.get("backend");
  if (backend) {
    const healthParam = url.searchParams.get("health") ?? "false";
    const includeHealth = ["1", "true", "yes"].includes(healthParam.toLowerCase());

    try {
      const servers = await fetchBackendServers(backend, includeHealth);
      return NextResponse.json({ backend, servers });
    } catch (err) {
      return NextResponse.json(
        { error: "upstream_error", message: String(err) },
        { status: 502 }
      );
    }
  }

  try {
    const upstream = await callDataplane(path, { method: "GET" });

    const body = await upstream.text();
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    headers.set("content-type", contentType);

    return new NextResponse(body, { status: upstream.status, headers });
  } catch (err) {
    return NextResponse.json(
      { error: "upstream_error", message: String(err) },
      { status: 502 }
    );
  }
}