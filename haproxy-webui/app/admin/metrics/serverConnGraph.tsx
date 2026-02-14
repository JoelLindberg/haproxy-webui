"use client";

import { useEffect, useState, useRef } from "react";
import styles from "../admin.module.css";

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

interface ServerConnection {
  name: string;
  backend: string;
  totalConnections: number;
  connectionsPerSec: number;
}

interface ServerConnGraphProps {
  backendName: string;
  refreshTrigger?: number;
}

export default function ServerConnGraph({ backendName, refreshTrigger }: ServerConnGraphProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ timestamp: string; data: ServerConnection[] }[]>([]);
  const prevTotalsRef = useRef<Map<string, number>>(new Map());
  const prevTimeRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/haproxy/metrics");

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: "Failed to parse error" }));
        setError(json.message || json.error || `HTTP ${res.status}: Failed to fetch metrics`);
        return;
      }

      const json: MetricsResponse = await res.json();
      setError(null);

      // Parse server session rates filtered to this backend
      const now = Date.now();
      const connections = parseServerConnections(json, now);
      const timestamp = new Date().toLocaleTimeString();

      // Filter out servers with invalid rates (counter resets or no previous data)
      const validConnections = connections.filter(c => c.connectionsPerSec >= 0);

      // Only add to history if we have valid data
      if (validConnections.length > 0) {
        setHistory(prev => {
          const newHistory = [...prev, { timestamp, data: validConnections }];
          // Keep last 30 data points
          return newHistory.slice(-30);
        });
      }
    } catch (err) {
      setError(`Error fetching metrics: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const parseServerConnections = (metricsData: MetricsResponse, now: number): ServerConnection[] => {
    const connections: ServerConnection[] = [];
    const elapsed = prevTimeRef.current ? (now - prevTimeRef.current) / 1000 : 0;
    
    // Find total sessions counter metric (same as connections for servers)
    const serverConnMetric = metricsData.metrics.find(
      m => m.name === "haproxy_server_sessions_total"
    );

    const newTotals = new Map<string, number>();

    if (serverConnMetric) {
      serverConnMetric.metrics.forEach(sample => {
        const serverName = sample.labels.server || "unknown";
        const backend = sample.labels.proxy || "unknown";
        const total = parseInt(sample.value) || 0;

        // Filter to the current backend only, exclude aggregate rows
        if (backend === backendName && serverName !== "BACKEND" && serverName !== "FRONTEND") {
          newTotals.set(serverName, total);
          const prevTotal = prevTotalsRef.current.get(serverName);
          
          let rate: number;
          if (prevTotal === undefined || elapsed <= 0) {
            rate = -1; // No previous data yet
          } else if (total < prevTotal) {
            // Counter decreased - likely reset or server restart
            // Don't update prevTotals for this server to establish new baseline
            rate = -1;
          } else {
            rate = (total - prevTotal) / elapsed;
          }

          connections.push({
            name: serverName,
            backend,
            totalConnections: total,
            connectionsPerSec: rate,
          });
        }
      });
    }

    prevTotalsRef.current = newTotals;
    prevTimeRef.current = now;

    // Sort by rate descending
    return connections.sort((a, b) => b.connectionsPerSec - a.connectionsPerSec);
  };

  // Reset rate calculation state when refreshTrigger changes, but keep history visible
  useEffect(() => {
    setHistory([]);
    prevTotalsRef.current = new Map();
    prevTimeRef.current = null;
  }, [refreshTrigger]);

  useEffect(() => {
    // Initial fetch
    fetchMetrics();

    // Set up auto-refresh every 5 seconds
    intervalRef.current = setInterval(fetchMetrics, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || history.length === 0) return;

    // Import Chart.js dynamically
    import('chart.js/auto').then(({ Chart }) => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current!.getContext('2d');
      if (!ctx) return;

      // Get server names from the most recent data point only
      // This ensures deleted servers disappear from the graph
      const latestData = history[history.length - 1];
      const serverNames = latestData.data.map(d => d.name);
      const colors = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)',
      ];

      const datasets = serverNames.map((serverName, idx) => ({
        label: serverName,
        data: history.map(h => {
          const server = h.data.find(d => d.name === serverName);
          const rate = server ? server.connectionsPerSec : 0;
          // Ensure we never display negative values
          return Math.max(0, Math.round(rate * 100) / 100);
        }),
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length].replace('0.8', '0.4'),
        fill: true,
        tension: 0.4,
      }));

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map(h => h.timestamp),
          datasets: datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 0,
          },
          plugins: {
            title: {
              display: true,
              text: `Server Connection Rate - ${backendName} (Real-time)`,
              font: {
                size: 16,
                weight: 'bold',
              },
            },
            legend: {
              display: true,
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            },
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Time',
              },
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Connections / sec',
              },
              beginAtZero: true,
              stacked: true,
            },
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
          },
        },
      });
    });
  }, [history]);

  if (loading && history.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading server connection data...</p>
      </div>
    );
  }

  if (error && history.length === 0) {
    return (
      <div style={{ padding: "2rem" }}>
        <div style={{ color: "#dc3545", marginBottom: "1rem" }}>
          {error}
        </div>
        <button onClick={fetchMetrics} className={styles.button}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '400px', width: '100%' }}>
      <canvas ref={canvasRef} />
      {error && (
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          background: '#f8d7da', 
          color: '#721c24',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
