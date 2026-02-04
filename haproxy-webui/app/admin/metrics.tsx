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

export default function Metrics() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

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
  }, []);

  const toggleMetric = (name: string) => {
    setExpandedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const filteredMetrics = data?.metrics.filter(
    (m) =>
      m.name.toLowerCase().includes(filter.toLowerCase()) ||
      m.help.toLowerCase().includes(filter.toLowerCase())
  );

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
      <div className={styles.diagnosticsGrid} style={{ marginBottom: "1rem" }}>
        <div className={styles.diagnosticItem}>
          <span className={styles.diagnosticLabel}>Total Metrics</span>
          <span className={styles.diagnosticValue}>{data.metricsCount}</span>
        </div>
        <div className={styles.diagnosticItem}>
          <span className={styles.diagnosticLabel}>Raw Size</span>
          <span className={styles.diagnosticValue}>
            {(data.rawLength / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Filter metrics by name or description..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "0.9rem",
          }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={fetchMetrics} className={styles.button}>
          Refresh Metrics
        </button>
      </div>

      <div
        style={{
          maxHeight: "500px",
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      >
        {filteredMetrics && filteredMetrics.length > 0 ? (
          filteredMetrics.map((metric) => (
            <div
              key={metric.name}
              style={{
                borderBottom: "1px solid #eee",
                padding: "0.5rem",
              }}
            >
              <div
                onClick={() => toggleMetric(metric.name)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {metric.name}
                  </strong>
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "0.75rem",
                      color: "#666",
                      backgroundColor: "#f0f0f0",
                      padding: "0.1rem 0.3rem",
                      borderRadius: "3px",
                    }}
                  >
                    {metric.type}
                  </span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "#888" }}>
                  {metric.metrics.length} sample{metric.metrics.length !== 1 ? "s" : ""}{" "}
                  {expandedMetrics.has(metric.name) ? "▼" : "▶"}
                </span>
              </div>
              {metric.help && (
                <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                  {metric.help}
                </div>
              )}
              {expandedMetrics.has(metric.name) && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    paddingLeft: "1rem",
                    fontSize: "0.8rem",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "4px",
                    padding: "0.5rem",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {metric.metrics.map((sample, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontFamily: "monospace",
                        marginBottom: "0.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "1rem",
                      }}
                    >
                      <span style={{ color: "#555", wordBreak: "break-all" }}>
                        {Object.keys(sample.labels).length > 0
                          ? `{${Object.entries(sample.labels)
                              .map(([k, v]) => `${k}="${v}"`)
                              .join(", ")}}`
                          : "(no labels)"}
                      </span>
                      <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                        {sample.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p style={{ padding: "1rem", color: "#666" }}>
            No metrics found matching filter.
          </p>
        )}
      </div>
    </div>
  );
}
