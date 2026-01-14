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
export async function fetchBackendServers(backend: string, health = false) {
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