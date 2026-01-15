"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

interface DiagnosticInfo {
  health: string;
  apiVersion: string;
  haproxyVersion: string;
  haproxyPid: number | null;
  haproxyUptime: string;
  haproxyProcesses: number;
  haproxyTotalBytesOut: number;
}

interface PingResult {
  status: number;
  data: any;
  timestamp: string;
}

export default function Diagnostics() {
  const [data, setData] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        console.log("Fetching diagnostics...");
        const res = await fetch("/api/haproxy/diagnostics");
        console.log("Diagnostics response status:", res.status);
        
        if (!res.ok) {
          const json = await res.json().catch(() => ({ error: "Failed to parse error" }));
          console.error("Diagnostics error:", json);
          setError(json.error || `HTTP ${res.status}: Failed to fetch diagnostics`);
          return;
        }
        
        const json = await res.json();
        console.log("Diagnostics data received:", json);
        
        // Map API response to DiagnosticInfo
        const diagnosticData: DiagnosticInfo = {
          health: json.health || "Unknown",
          apiVersion: json.apiVersion || "Unknown",
          haproxyVersion: json.haproxyVersion || "Unknown",
          haproxyPid: json.haproxyPid ?? null,
          haproxyUptime: json.haproxyUptime || "Unknown",
          haproxyProcesses: json.haproxyProcesses ?? 0,
          haproxyTotalBytesOut: json.haproxyTotalBytesOut ?? 0,
        };
        
        console.log("Mapped diagnostic data:", diagnosticData);
        setData(diagnosticData);
      } catch (err) {
        console.error("Error fetching diagnostics:", err);
        setError(`Error fetching diagnostics: ${String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnostics();
  }, []);

  const testPingAPI = async () => {
    setPinging(true);
    try {
      const r = await fetch("/api/ping");
      const j = await r.json();
      setPingResult({
        status: r.status,
        data: j,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (e) {
      setPingResult({
        status: 0,
        data: { error: String(e) },
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setPinging(false);
    }
  };

  if (loading) return <div className={styles.placeholder}>Loading diagnostics...</div>;
  if (error) return <div className={styles.placeholder}>Error: {error}</div>;
  if (!data) return <div className={styles.placeholder}>No diagnostic data available</div>;

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>API Version</td>
              <td>{data.apiVersion}</td>
            </tr>
            <tr>
              <td>HAProxy Version</td>
              <td>{data.haproxyVersion}</td>
            </tr>
            <tr>
              <td>HAProxy Process ID</td>
              <td>{data.haproxyPid ?? "—"}</td>
            </tr>
            <tr>
              <td>HAProxy Uptime</td>
              <td>{data.haproxyUptime}</td>
            </tr>
            <tr>
              <td>Processes</td>
              <td>{data.haproxyProcesses}</td>
            </tr>
            <tr>
              <td>Total Bytes Out</td>
              <td>{data.haproxyTotalBytesOut.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Health</td>
              <td>
                <span
                  className={`${styles.statusBadge} ${
                    data.health === "up"
                      ? styles.statusUp
                      : styles.statusDown
                  }`}
                >
                  {data.health ?? "—"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <button
          onClick={testPingAPI}
          disabled={pinging}
          className={styles.logoutBtn}
          style={{ background: "#6b7280" }}
        >
          {pinging ? "Pinging..." : "Ping API"}
        </button>

        {pingResult && (
          <div className={styles.terminalBlock}>
            <div className={styles.terminalLine}>
              <span className={styles.terminalLabel}>Status:</span>{" "}
              <span className={styles.terminalValue}>{pingResult.status}</span>
            </div>
            <div className={styles.terminalLine}>
              <span className={styles.terminalLabel}>Time:</span>{" "}
              <span className={styles.terminalValue}>{pingResult.timestamp}</span>
            </div>
            <div className={styles.terminalLine}>
              <span className={styles.terminalLabel}>Response:</span>
              <pre className={styles.terminalPre}>
                {JSON.stringify(pingResult.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
