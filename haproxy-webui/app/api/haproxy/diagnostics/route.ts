import { NextResponse } from "next/server";
import { callDataplane } from "@/services/haproxy";
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
    // Call the HAProxy Data Plane API /v3/info endpoint for version info
    const infoRes = await callDataplane("/v3/info");

    if (!infoRes.ok) {
      const body = await infoRes.text().catch(() => "");
      return NextResponse.json(
        { error: "upstream_error", message: body },
        { status: infoRes.status }
      );
    }

    const infoData = await infoRes.json();

    // Log the raw response to help debug
    console.log("HAProxy /v3/info response:", JSON.stringify(infoData, null, 2));

    // Fetch health status from /v3/health endpoint
    const healthRes = await callDataplane("/v3/health");
    let healthStatus = "Unknown";
    
    if (healthRes.ok) {
      const healthData = await healthRes.json();
      console.log("HAProxy /v3/health response:", JSON.stringify(healthData, null, 2));
      // Response format: {"haproxy": "up"}
      healthStatus = healthData.haproxy ?? "Unknown";
    }

    // Fetch HAProxy version from runtime info endpoint
    const runtimeRes = await callDataplane("/v3/services/haproxy/runtime/info");
    let haproxyVersion = "Unknown";
    let haproxyPid = null;
    let haproxyUptime = "Unknown";
    let haproxyProcesses = 0;
    let haproxyTotalBytesOut = 0;
    
    if (runtimeRes.ok) {
      const runtimeData = await runtimeRes.json();
      console.log("HAProxy runtime info response:", JSON.stringify(runtimeData, null, 2));
      // Response format: {"info": {"version": "3.2.8-9200f39", "pid": 99, "uptime": 3935, ...}, ...}
      haproxyVersion = runtimeData.info?.version ?? "Unknown";
      haproxyPid = runtimeData.info?.pid ?? null;
      
      // Format uptime from seconds to readable format
      const uptimeSeconds = runtimeData.info?.uptime ?? 0;
      if (uptimeSeconds > 0) {
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        haproxyUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }
      
      haproxyProcesses = runtimeData.info?.processes ?? 0;
      haproxyTotalBytesOut = runtimeData.info?.total_bytes_out ?? 0;
    }

    // Extract relevant diagnostic information from the response
    // Response format: {"api":{"build_date":"...","version":"v3.2.5 152e8a06"},"system":{}}
    const apiVersion = infoData.api?.version ?? "Unknown";
    const buildDate = infoData.api?.build_date ?? null;

    return NextResponse.json({
      apiVersion: apiVersion,
      haproxyVersion: haproxyVersion,
      buildDate: buildDate,
      health: healthStatus,
      haproxyPid: haproxyPid,
      haproxyUptime: haproxyUptime,
      haproxyProcesses: haproxyProcesses,
      haproxyTotalBytesOut: haproxyTotalBytesOut,
      // Include raw data for debugging
      _raw: infoData,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "fetch_error", message: String(err) },
      { status: 500 }
    );
  }
}
