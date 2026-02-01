import { NextResponse } from "next/server";
import { callDataplane, createBackend, getConfigurationVersion } from "@/services/haproxy";
import { ensureAuthenticated } from "@/lib/serverAuth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/haproxy/backend?name=my-backend
 * Fetches backend details (algorithm, mode, status) from HAProxy Data Plane API.
 */
export async function GET(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const name = url.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "missing_parameter", message: "name parameter is required" },
      { status: 400 }
    );
  }

  // haproxy dataplane API example to fetch info from a backend named db_be:
  // v3/services/haproxy/stats/native?type=backend&name=db_be
  try {
    const res = await callDataplane(
      `/v3/services/haproxy/stats/native?type=backend&name=${encodeURIComponent(name)}`
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "upstream_error", message: body },
        { status: res.status }
      );
    }

    const data = await res.json();

    // dataplane returns { runtimeAPI: "...", stats: [ { name: "...", stats: { algo, mode, status, ... } } ] }
    const entry = Array.isArray(data.stats) && data.stats.length > 0 ? data.stats[0] : null;
    const s = entry?.stats ?? {};

    return NextResponse.json({
        name: entry?.name ?? name,
        algorithm: s.algo ?? null,
        mode: s.mode ?? null,
        status: s.status ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "upstream_error", message: String(err) },
      { status: 502 }
    );
  }
}

/**
 * POST /api/haproxy/backend
 * Creates a new backend entry in both HAProxy configuration and the database.
 */
export async function POST(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { name, mode } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "invalid_parameter", message: "name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const backendName = name.trim();
    const backendMode = mode && typeof mode === "string" ? mode : "http";

    // Get current configuration version
    const version = await getConfigurationVersion();

    // Create backend in HAProxy configuration
    try {
      await createBackend(backendName, version, backendMode);
    } catch (haproxyErr: any) {
      return NextResponse.json(
        { error: "haproxy_error", message: `Failed to create backend in HAProxy: ${haproxyErr.message}` },
        { status: 500 }
      );
    }

    // Insert backend into database
    try {
      await db.execute(
        sql`INSERT INTO haproxy_backends (name, created_at, updated_at) VALUES (${backendName}, NOW(), NOW())`
      );
    } catch (dbErr: any) {
      // Check for duplicate entry error
      if (dbErr.code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          { error: "duplicate_entry", message: "Backend with this name already exists in database" },
          { status: 409 }
        );
      }
      // If database insert fails, we should ideally rollback the HAProxy config
      // For now, just return the error
      return NextResponse.json(
        { error: "database_error", message: `Backend created in HAProxy but database insert failed: ${String(dbErr)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Backend created successfully in HAProxy and database",
      name: backendName,
      mode: backendMode,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: String(err) },
      { status: 500 }
    );
  }
}