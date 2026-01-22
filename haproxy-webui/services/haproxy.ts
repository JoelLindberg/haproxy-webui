/**
 * Small helper that performs requests to the HAProxy Data Plane API.
 * Reads credentials and base URL from environment variables:
 *   HAPROXY_DATAPLANE_BASE_URL (default http://localhost:5555)
 *   HAPROXY_DATAPLANE_USER
 *   HAPROXY_DATAPLANE_PASS
 *
 * Put shared logic (retry, logging, advanced error handling) here.
 */

export async function callDataplane(path: string, opts: RequestInit = {}) {
  const base = process.env.HAPROXY_DATAPLANE_BASE_URL ?? "http://localhost:5555";
  const user = process.env.HAPROXY_DATAPLANE_USER ?? "admin";
  const pass = process.env.HAPROXY_DATAPLANE_PASS ?? "";

  // build url (preserve leading slash in path)
  const url = new URL(path, base).toString();

  const headers = new Headers(opts.headers ?? {});
  if (!headers.has("authorization")) {
    // Basic auth
    const basic = Buffer.from(`${user}:${pass}`).toString("base64");
    headers.set("authorization", `Basic ${basic}`);
  }

  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    // let caller inspect status/body if needed; do not throw here unless desired
  }
  return res;
}

// New helper: fetch servers' status (and optional health) for a given backend
export async function getBackendStats(backend: string, health = false) {
  // Use the Data Plane API stats endpoint filtered by pxname (proxy/backend) and server type.
  const path = `/v3/services/haproxy/stats?pxname=${encodeURIComponent(backend)}&type=server`;
  const res = await callDataplane(path);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Dataplane API error ${res.status}: ${body}`);
  }

  const stats: any[] = await res.json().catch(() => {
    throw new Error("Failed to parse dataplane stats response as JSON");
  });

  // Map stats entries to a compact shape: { server, status, ...optional health fields }
  return stats.map((s) => {
    const serverName = s.svname ?? s.sname ?? s.name ?? "unknown";
    const result: any = {
      server: serverName,
      status: s.status ?? null,
    };
    if (health) {
      // include common health/check fields if present
      if (s.check_status !== undefined) result.check_status = s.check_status;
      if (s.check_state !== undefined) result.check_state = s.check_state;
      if (s.health !== undefined) result.health = s.health;
      if (s.last_chk !== undefined) result.last_check = s.last_chk;
    }
    return result;
  });
}

// Fetch comprehensive diagnostics from HAProxy Data Plane API
export async function getDiagnostics() {
  // Fetch API info
  const infoRes = await callDataplane("/v3/info");
  if (!infoRes.ok) {
    const body = await infoRes.text().catch(() => "");
    throw new Error(`Failed to fetch info: ${infoRes.status} ${body}`);
  }
  const infoData = await infoRes.json();

  // Fetch health status
  const healthRes = await callDataplane("/v3/health");
  let healthStatus = "Unknown";
  if (healthRes.ok) {
    const healthData = await healthRes.json();
    healthStatus = healthData.haproxy ?? "Unknown";
  }

  // Fetch runtime info
  const runtimeRes = await callDataplane("/v3/services/haproxy/runtime/info");
  let haproxyVersion = "Unknown";
  let haproxyPid = null;
  let haproxyUptime = "Unknown";
  let haproxyProcesses = 0;
  let haproxyTotalBytesOut = 0;

  if (runtimeRes.ok) {
    const runtimeData = await runtimeRes.json();
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

  const apiVersion = infoData.api?.version ?? "Unknown";
  const buildDate = infoData.api?.build_date ?? null;

  return {
    apiVersion,
    haproxyVersion,
    buildDate,
    health: healthStatus,
    haproxyPid,
    haproxyUptime,
    haproxyProcesses,
    haproxyTotalBytesOut,
    _raw: infoData,
  };
}

// Fetch backend server configuration
export async function getBackendServers(parentName: string) {
  const path = `/v3/services/haproxy/configuration/backends/${encodeURIComponent(parentName)}/servers`;
  const res = await callDataplane(path);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Dataplane API error ${res.status}: ${body}`);
  }

  const servers = await res.json().catch(() => {
    throw new Error("Failed to parse dataplane servers response as JSON");
  });

  return servers;
}

// Get current configuration version
export async function getConfigVersion() {
  const path = `/v3/services/haproxy/configuration/global`;
  const res = await callDataplane(path);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Dataplane API error ${res.status}: ${body}`);
  }

  const data = await res.json().catch(() => {
    throw new Error("Failed to parse dataplane global config response as JSON");
  });

  // The version is typically in the _version field
  return data._version ?? 1;
}

// Get current configuration version from version endpoint
export async function getConfigurationVersion() {
  const path = `/v3/services/haproxy/configuration/version`;
  const res = await callDataplane(path);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Dataplane API error ${res.status}: ${body}`);
  }

  const data = await res.json().catch(() => {
    throw new Error("Failed to parse version response as JSON");
  });

  // Return the version number
  return typeof data === 'number' ? data : (data.version ?? 1);
}

// Create a new backend in HAProxy configuration
export async function createBackend(name: string, version: number, mode: string = "http") {
  // Create the backend with the provided version
  const path = `/v3/services/haproxy/configuration/backends?version=${version}`;
  const res = await callDataplane(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      mode: mode,
      balance: {
        algorithm: "roundrobin"
      }
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to create backend: ${res.status} ${body}`);
  }

  const result = await res.json().catch(() => ({}));
  return result;
}

// Create a new server in a backend
export async function createServer(
  backendName: string,
  serverName: string,
  address: string,
  port: number,
  version: number,
  check: boolean = true
) {
  // Create the server with the provided version
  const path = `/v3/services/haproxy/configuration/backends/${encodeURIComponent(backendName)}/servers?version=${version}`;
  const res = await callDataplane(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: serverName,
      address: address,
      port: port,
      check: check ? "enabled" : "disabled"
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to create server: ${res.status} ${body}`);
  }

  const result = await res.json().catch(() => ({}));
  return result;
}

// Delete a server from a backend
export async function deleteServer(
  backendName: string,
  serverName: string,
  version: number
) {
  // Delete the server with the provided version
  const path = `/v3/services/haproxy/configuration/backends/${encodeURIComponent(backendName)}/servers/${encodeURIComponent(serverName)}?version=${version}`;
  const res = await callDataplane(path, {
    method: "DELETE",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to delete server: ${res.status} ${body}`);
  }

  // DELETE may return empty response or JSON
  const result = await res.text().then((text) => {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  });
  
  return result;
}