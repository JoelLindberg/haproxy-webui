"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

interface BackendData {
  name: string;
  algorithm: string | null;
  mode: string | null;
  status: string | null;
}

interface BackendServer {
  name: string;
  address: string;
  port: number;
  check: string;
}

interface RuntimeServer {
  name: string;
  address: string;
  port: number;
  admin_state: "ready" | "drain" | "maint";
  operational_state: "up" | "down" | "stopping";
  currentSessions: number;
  queuedConnections: number;
  totalSessions: number;
}

interface BackendDetailsProps {
  backendName: string;
  refreshTrigger?: number;
}

export default function BackendDetails({ backendName, refreshTrigger }: BackendDetailsProps) {
  const [data, setData] = useState<BackendData | null>(null);
  const [servers, setServers] = useState<BackendServer[]>([]);
  const [runtimeServers, setRuntimeServers] = useState<RuntimeServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [serversLoading, setServersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serversError, setServersError] = useState<string | null>(null);
  const [notInHAProxy, setNotInHAProxy] = useState(false);
  const [manualRefresh, setManualRefresh] = useState(0);

  const handleRefresh = () => {
    setServersLoading(true);
    setManualRefresh(prev => prev + 1);
  };

  useEffect(() => {
    const fetchBackend = async () => {
      try {
        const res = await fetch(
          `/api/haproxy/backend?name=${encodeURIComponent(backendName)}`
        );
        if (!res.ok) {
          const json = await res.json();
          // If backend not found in HAProxy, show a helpful message
          if (res.status === 404 || json.error === "upstream_error") {
            setNotInHAProxy(true);
          } else {
            setError(json.error || "Failed to fetch backend details");
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError("Error fetching backend details");
      } finally {
        setLoading(false);
      }
    };

    const fetchServers = async () => {
      try {
        // Fetch both configuration and runtime server data
        const [configRes, runtimeRes] = await Promise.all([
          fetch(`/api/haproxy/backend/servers?parentName=${encodeURIComponent(backendName)}`),
          fetch(`/api/haproxy/backend/servers/runtime?parentName=${encodeURIComponent(backendName)}`)
        ]);
        
        if (!configRes.ok) {
          const json = await configRes.json();
          setServersError(json.error || "Failed to fetch servers");
          return;
        }
        
        const configJson = await configRes.json();
        setServers(Array.isArray(configJson) ? configJson : []);
        
        if (runtimeRes.ok) {
          const runtimeJson = await runtimeRes.json();
          setRuntimeServers(Array.isArray(runtimeJson) ? runtimeJson : []);
        }
      } catch (err) {
        setServersError("Error fetching servers");
      } finally {
        setServersLoading(false);
      }
    };

    fetchBackend();
    fetchServers();
  }, [backendName, refreshTrigger, manualRefresh]);

  if (loading) return <div className={styles.placeholder}>Loading...</div>;
  if (error) return <div className={styles.placeholder}>Error: {error}</div>;
  if (notInHAProxy) {
    return (
      <div className={styles.placeholder}>
        <p>Backend exists in database but not yet configured in HAProxy.</p>
        <p style={{ fontSize: "0.75rem", marginTop: "0.5rem", color: "var(--muted)" }}>
          Configure this backend via the HAProxy Dataplane API to see live metrics.
        </p>
      </div>
    );
  }
  if (!data) return <div className={styles.placeholder}>No data</div>;

  return (
    <>
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td>{data.name}</td>
          </tr>
          <tr>
            <td>Algorithm</td>
            <td>{data.algorithm ?? "—"}</td>
          </tr>
          <tr>
            <td>Mode</td>
            <td>{data.mode ?? "—"}</td>
          </tr>
          <tr>
            <td>Status</td>
            <td>
              <span
                className={`${styles.statusBadge} ${
                  data.status === "UP"
                    ? styles.statusUp
                    : styles.statusDown
                }`}
              >
                {data.status ?? "—"}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2rem", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, color: "var(--text)" }}>Servers</h3>
        <button
          onClick={handleRefresh}
          className={styles.refreshButton}
          disabled={serversLoading}
          title="Refresh server status"
        >
          {serversLoading ? "↻" : "↻"}
        </button>
      </div>
      <div className={styles.tableContainer}>
      {serversLoading ? (
        <div className={styles.placeholder}>Loading servers...</div>
      ) : serversError ? (
        <div className={styles.placeholder}>Error loading servers: {serversError}</div>
      ) : servers.length === 0 ? (
        <div className={styles.placeholder}>No servers configured</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Port</th>
              <th>Status</th>
              <th>State</th>
              <th>Connections</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server, idx) => {
              const runtime = runtimeServers.find(r => r.name === server.name);
              const operationalState = runtime?.operational_state ?? "unknown";
              const adminState = runtime?.admin_state ?? "unknown";
              const currentSessions = runtime?.currentSessions ?? 0;
              const queuedConnections = runtime?.queuedConnections ?? 0;
              
              return (
                <tr key={idx}>
                  <td>{server.name}</td>
                  <td>{server.address}</td>
                  <td>{server.port}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        operationalState === "up"
                          ? styles.statusUp
                          : operationalState === "down"
                          ? styles.statusDown
                          : operationalState === "stopping"
                          ? styles.statusStopping
                          : styles.statusUnknown
                      }`}
                    >
                      {operationalState.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.stateBadge} ${
                        adminState === "ready"
                          ? styles.stateReady
                          : adminState === "drain"
                          ? styles.stateDrain
                          : adminState === "maint"
                          ? styles.stateMaint
                          : ""
                      }`}
                    >
                      {adminState === "maint" ? "MAINT" : adminState.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span title={queuedConnections > 0 ? `${queuedConnections} queued` : undefined}>
                      {currentSessions}
                      {queuedConnections > 0 && <span style={{ color: "var(--warning)", marginLeft: "0.25rem" }}>+{queuedConnections}q</span>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      </div>
    </>
  );
}