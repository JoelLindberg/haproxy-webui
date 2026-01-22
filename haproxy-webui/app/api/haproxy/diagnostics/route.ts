import { NextResponse } from "next/server";
import { getDiagnostics } from "@/services/haproxy";
import { ensureAuthenticated } from "@/lib/serverAuth";

/**
 * GET /api/haproxy/diagnostics
 * Fetches diagnostics information from HAProxy Data Plane API.
 * Returns: version, uptime, process ID, current connections, total connections
 */
export async function GET(req: Request) {
  // enforce auth
  const auth = ensureAuthenticated(req);
  if (auth) return auth;

  try {
    const diagnostics = await getDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (err) {
    return NextResponse.json(
      { error: "fetch_error", message: String(err) },
      { status: 500 }
    );
  }
}
