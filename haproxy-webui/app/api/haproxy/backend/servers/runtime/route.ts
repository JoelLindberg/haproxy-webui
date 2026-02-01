import { NextResponse } from "next/server";
import { getRuntimeServers, getServerStats } from "@/services/haproxy";
import { ensureAuthenticated } from "@/lib/serverAuth";

/**
 * GET /api/haproxy/backend/servers/runtime?parentName=app_be
 * Fetches runtime server information from HAProxy Data Plane API.
 * Returns: array of servers with admin_state (ready/drain/maint), operational_state (up/down), and stats
 */
export async function GET(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const parentName = url.searchParams.get("parentName");

  if (!parentName) {
    return NextResponse.json(
      { error: "missing_parameter", message: "parentName query parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch both runtime and stats data in parallel
    const [servers, stats] = await Promise.all([
      getRuntimeServers(parentName),
      getServerStats(parentName),
    ]);

    // Define type for stats entries
    interface ServerStats {
      name: string;
      currentSessions: number;
      queuedConnections: number;
      totalSessions: number;
    }

    // Merge stats into runtime server data
    const statsMap = new Map<string, ServerStats>(stats.map((s: ServerStats) => [s.name, s]));
    const enrichedServers = servers.map((server: { name: string; admin_state?: string; operational_state?: string }) => {
      const serverStats = statsMap.get(server.name);
      return {
        ...server,
        currentSessions: serverStats?.currentSessions ?? 0,
        queuedConnections: serverStats?.queuedConnections ?? 0,
        totalSessions: serverStats?.totalSessions ?? 0,
      };
    });

    return NextResponse.json(enrichedServers);
  } catch (err) {
    return NextResponse.json(
      { error: "fetch_error", message: String(err) },
      { status: 500 }
    );
  }
}
