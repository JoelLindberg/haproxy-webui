import { NextResponse } from "next/server";
import { callDataplane } from "@/services/haproxy";

/**
 * GET /api/haproxy?path=/v3/health
 * Proxies requests to the HAProxy Data Plane API.
 * - `path` query param is appended to the configured base URL (default: /v3/health).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "/v3/health";

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