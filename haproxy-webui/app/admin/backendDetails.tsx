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

interface BackendDetailsProps {
  backendName: string;
}

export default function BackendDetails({ backendName }: BackendDetailsProps) {
  const [data, setData] = useState<BackendData | null>(null);
  const [servers, setServers] = useState<BackendServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [serversLoading, setServersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serversError, setServersError] = useState<string | null>(null);
  const [notInHAProxy, setNotInHAProxy] = useState(false);

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
        const res = await fetch(
          `/api/haproxy/backend/servers?parentName=${encodeURIComponent(backendName)}`
        );
        if (!res.ok) {
          const json = await res.json();
          setServersError(json.error || "Failed to fetch servers");
          return;
        }
        const json = await res.json();
        setServers(Array.isArray(json) ? json : []);
      } catch (err) {
        setServersError("Error fetching servers");
      } finally {
        setServersLoading(false);
      }
    };

    fetchBackend();
    fetchServers();
  }, [backendName]);

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

    
      <h3 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Servers</h3>
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
              <th>Health Check</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server, idx) => (
              <tr key={idx}>
                <td>{server.name}</td>
                <td>{server.address}</td>
                <td>{server.port}</td>
                <td>{server.check ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </>
  );
}