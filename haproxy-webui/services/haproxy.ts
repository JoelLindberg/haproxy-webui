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