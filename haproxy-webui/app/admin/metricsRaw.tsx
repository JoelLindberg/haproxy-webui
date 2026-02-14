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
  const [expandedMetrics, setExpandedMetrics] = useState<string[]>([]);
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
      if (prev.includes(name)) {
        return prev.filter(m => m !== name);
      } else {
        return [...prev, name];
      }
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
          className={styles.metricsRawFilterInput}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={fetchMetrics} className={styles.button}>
          Refresh Metrics
        </button>
      </div>

      <div className={styles.metricsRawContainer}>
        {filteredMetrics && filteredMetrics.length > 0 ? (
          filteredMetrics.map((metric) => (
            <div key={metric.name} className={styles.metricsRawItem}>
              <div
                onClick={() => toggleMetric(metric.name)}
                className={styles.metricsRawHeader}
              >
                <div>
                  <strong className={styles.metricsRawName}>
                    {metric.name}
                  </strong>
                  <span className={styles.metricsRawType}>
                    {metric.type}
                  </span>
                </div>
                <span className={styles.metricsRawSampleCount}>
                  {metric.metrics.length} sample{metric.metrics.length !== 1 ? "s" : ""}{" "}
                  {expandedMetrics.includes(metric.name) ? "▼" : "▶"}
                </span>
              </div>
              {metric.help && (
                <div className={styles.metricsRawHelp}>
                  {metric.help}
                </div>
              )}
              {expandedMetrics.includes(metric.name) && (
                <div className={styles.metricsRawExpandedData}>
                  {metric.metrics.map((sample, idx) => (
                    <div key={idx} className={styles.metricsRawSample}>
                      <span className={styles.metricsRawSampleLabel}>
                        {sample.labels && Object.keys(sample.labels).length > 0
                          ? `{${Object.entries(sample.labels)
                              .map(([k, v]) => `${k}="${v}"`)
                              .join(", ")}}`
                          : "(no labels)"}
                      </span>
                      <span className={styles.metricsRawSampleValue}>
                        {sample.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className={styles.metricsRawNoResults}>
            No metrics found matching filter.
          </p>
        )}
      </div>
    </div>
  );
}
