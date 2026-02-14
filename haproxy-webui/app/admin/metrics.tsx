"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

interface MetricSample {
  labels: Record<string, string>;
  value: string;
}

interface MetricEntry {
  name: string;
  help: string;
  type: string;
  metrics: MetricSample[];
}

interface MetricsResponse {
  success: boolean;
  metricsCount: number;
  metrics: MetricEntry[];
  rawLength: number;
}

interface SessionMetric {
  name: string;
  type: "frontend" | "backend";
  currentSessions: number;
  maxSessions: number;
  totalSessions: number;
  sessionRate: number;
}

export default function Metrics() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/haproxy/metrics");

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: "Failed to parse error" }));
        setError(json.message || json.error || `HTTP ${res.status}: Failed to fetch metrics`);
        return;
      }

      const json: MetricsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(`Error fetching metrics: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Auto-refresh every 15 seconds
    const intervalId = setInterval(() => {
      fetchMetrics();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const parseSessionMetrics = (): SessionMetric[] => {
    if (!data) return [];

    const metrics: SessionMetric[] = [];
    const processedNames = new Set<string>();

    // Find relevant metrics
    const currentSessionsMetric = data.metrics.find(m => m.name === "haproxy_frontend_current_sessions" || m.name === "haproxy_backend_current_sessions");
    const maxSessionsMetric = data.metrics.find(m => m.name === "haproxy_frontend_max_sessions" || m.name === "haproxy_backend_max_sessions");
    const totalSessionsMetric = data.metrics.find(m => m.name === "haproxy_frontend_sessions_total" || m.name === "haproxy_backend_sessions_total");
    const sessionRateMetric = data.metrics.find(m => m.name === "haproxy_frontend_current_session_rate" || m.name === "haproxy_backend_current_session_rate");

    // Process frontends
    const frontendCurrentSessions = data.metrics.find(m => m.name === "haproxy_frontend_current_sessions");
    if (frontendCurrentSessions) {
      frontendCurrentSessions.metrics.forEach(sample => {
        const name = sample.labels.proxy || "unknown";
        if (!processedNames.has(`frontend_${name}`)) {
          processedNames.add(`frontend_${name}`);
          
          const maxSessions = data.metrics
            .find(m => m.name === "haproxy_frontend_max_sessions")
            ?.metrics.find(s => s.labels.proxy === name)?.value || "0";
          
          const totalSessions = data.metrics
            .find(m => m.name === "haproxy_frontend_sessions_total")
            ?.metrics.find(s => s.labels.proxy === name)?.value || "0";
          
          const sessionRate = data.metrics
            .find(m => m.name === "haproxy_frontend_current_session_rate")
            ?.metrics.find(s => s.labels.proxy === name)?.value || "0";

          metrics.push({
            name,
            type: "frontend",
            currentSessions: parseInt(sample.value) || 0,
            maxSessions: parseInt(maxSessions) || 0,
            totalSessions: parseInt(totalSessions) || 0,
            sessionRate: parseFloat(sessionRate) || 0,
          });
        }
      });
    }

    // Process backends
    const backendCurrentSessions = data.metrics.find(m => m.name === "haproxy_backend_current_sessions");
    if (backendCurrentSessions) {
      backendCurrentSessions.metrics.forEach(sample => {
        const name = sample.labels.proxy || "unknown";
        if (!processedNames.has(`backend_${name}`)) {
          processedNames.add(`backend_${name}`);
          
          const maxSessions = data.metrics
            .find(m => m.name === "haproxy_backend_max_sessions")
            ?.metrics.find(s => s.labels.proxy === name)?.value || "0";
          
          const totalSessions = data.metrics
            .find(m => m.name === "haproxy_backend_sessions_total")
            ?.metrics.find(s => s.labels.proxy === name)?.value || "0";
          
          const sessionRate = data.metrics
            .find(m => m.name === "haproxy_backend_current_session_rate")
            ?.metrics.find(s => s.labels.proxy === name)?.value || "0";

          metrics.push({
            name,
            type: "backend",
            currentSessions: parseInt(sample.value) || 0,
            maxSessions: parseInt(maxSessions) || 0,
            totalSessions: parseInt(totalSessions) || 0,
            sessionRate: parseFloat(sessionRate) || 0,
          });
        }
      });
    }

    return metrics;
  };

  const sessionMetrics = parseSessionMetrics();

  if (loading) {
    return (
      <div className={styles.diagnosticsGrid}>
        <p>Loading metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.diagnosticsGrid}>
        <div className={styles.diagnosticItem}>
          <span className={styles.diagnosticLabel}>Error</span>
          <span className={styles.diagnosticValue} style={{ color: "#dc3545" }}>
            {error}
          </span>
        </div>
        <button onClick={fetchMetrics} className={styles.button} style={{ marginTop: "1rem" }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.diagnosticsGrid}>
        <p>No metrics data available</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>
          Metrics <span style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text)" }}>(Updates every 15 seconds)</span>
        </h2>
        <button
          onClick={fetchMetrics}
          className={styles.refreshButton}
          disabled={loading}
          title="Refresh metrics"
        >
          ↻
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className={styles.metricsTable}>
          <thead>
            <tr>
              <th className={styles.metricsTableHeaderRight}>Name</th>
              <th>Type</th>
              <th className={styles.metricsTableHeaderRight}>Current Sessions</th>
              <th className={styles.metricsTableHeaderRight}>Max Sessions</th>
              <th className={styles.metricsTableHeaderRight}>Total Sessions</th>
              <th className={styles.metricsTableHeaderRight}>Session Rate</th>
            </tr>
          </thead>
          <tbody>
            {sessionMetrics.length > 0 ? (
              sessionMetrics.map((metric, idx) => (
                <tr key={`${metric.type}_${metric.name}`}>
                  <td className={styles.metricsTableName}>
                    {metric.name}
                  </td>
                  <td>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      backgroundColor: metric.type === "frontend" ? "#e3f2fd" : "#f3e5f5",
                      color: metric.type === "frontend" ? "#1976d2" : "#7b1fa2"
                    }}>
                      {metric.type}
                    </span>
                  </td>
                  <td className={styles.metricsTableCellRight} style={{ fontWeight: 600 }}>
                    {metric.currentSessions.toLocaleString()}
                  </td>
                  <td className={styles.metricsTableCellRight}>
                    {metric.maxSessions.toLocaleString()}
                  </td>
                  <td className={styles.metricsTableCellRight}>
                    {metric.totalSessions.toLocaleString()}
                  </td>
                  <td className={styles.metricsTableCellRight}>
                    {metric.sessionRate.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "var(--subtext)" }}>
                  No session metrics available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#6c757d" }}>
          Total metrics: {data.metricsCount} | Raw size: {(data.rawLength / 1024).toFixed(1)} KB
        </div>
      )}
    </div>
  );
}
