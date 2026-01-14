"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

interface BackendData {
  name: string;
  algorithm: string | null;
  mode: string | null;
  status: string | null;
}

interface BackendDetailsProps {
  backendName: string;
}

export default function BackendDetails({ backendName }: BackendDetailsProps) {
  const [data, setData] = useState<BackendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

    fetchBackend();
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
  );
}