"use client";

import { useEffect, useState, useRef } from "react";
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

interface ServerConnection {
  name: string;
  backend: string;
  totalConnections: number;
  connectionsPerSec: number;
}

export default function ServerConnGraph() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ timestamp: string; data: ServerConnection[] }[]>([]);
  const prevTotalsRef = useRef<Map<string, number>>(new Map());
  const prevTimeRef = useRef<number | null>(null);
  const currentServersRef = useRef<Set<string>>(new Set());
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

      // Parse server connection rates
      const now = Date.now();
      const isFirstTick = prevTimeRef.current === null;
      const connections = parseServerConnections(json, now);
      const timestamp = new Date().toLocaleTimeString();

      // Skip the first tick - we have no previous data so all rates are 0
      if (!isFirstTick) {
        setHistory(prev => {
          const newHistory = [...prev, { timestamp, data: connections }];
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
    const currentServerKeys = new Set<string>();

    if (serverConnMetric) {
      serverConnMetric.metrics.forEach(sample => {
        const serverName = sample.labels.server || "unknown";
        const backend = sample.labels.proxy || "unknown";
        const total = parseInt(sample.value) || 0;

        if (serverName !== "BACKEND" && serverName !== "FRONTEND") {
          const key = `${backend}/${serverName}`;
          currentServerKeys.add(key);
          newTotals.set(key, total);
          const prevTotal = prevTotalsRef.current.get(key);
          
          let rate: number;
          if (prevTotal === undefined || elapsed <= 0) {
            rate = 0; // No previous data yet - show as 0
          } else if (total < prevTotal) {
            // Counter reset (e.g., HAProxy reload after config change)
            // Use total as approximate delta from 0 since restart
            rate = total / elapsed;
          } else {
            rate = (total - prevTotal) / elapsed;
          }

          connections.push({
            name: key,
            backend,
            totalConnections: total,
            connectionsPerSec: rate,
          });
        }
      });
    }

    // Update the set of currently-existing servers (used for strikethrough)
    currentServersRef.current = currentServerKeys;

    // Remove deleted servers from prevTotalsRef to prevent stale data
    for (const key of Array.from(prevTotalsRef.current.keys())) {
      if (!currentServerKeys.has(key)) {
        prevTotalsRef.current.delete(key);
      }
    }

    // Only update prevTotals for servers that exist in current metrics
    currentServerKeys.forEach(key => {
      const total = newTotals.get(key);
      if (total !== undefined) {
        prevTotalsRef.current.set(key, total);
      }
    });

    prevTimeRef.current = now;

    // Sort by rate descending and get top 5
    return connections
      .sort((a, b) => b.connectionsPerSec - a.connectionsPerSec)
      .slice(0, 5);
  };

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

      // Get all unique server names from history (including deleted ones)
      const allServers = new Set<string>();
      history.forEach(h => {
        h.data.forEach(d => allServers.add(d.name));
      });
      
      const serverNames = Array.from(allServers).slice(0, 5);
      const colors = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)',
      ];

      const datasets = serverNames.map((serverName, idx) => {
        // Use the ref tracking ALL servers in metrics, not just the top-5 subset
        const isDeleted = !currentServersRef.current.has(serverName);
        return {
          label: isDeleted ? `~~${serverName}~~` : serverName,
          data: history.map(h => {
            const server = h.data.find(d => d.name === serverName);
            const rate = server ? server.connectionsPerSec : 0;
            return Math.max(0, Math.round(rate * 100) / 100);
          }),
          borderColor: colors[idx % colors.length],
          backgroundColor: colors[idx % colors.length].replace('0.8', '0.4'),
          borderDash: isDeleted ? [5, 5] : [],
          fill: true,
          tension: 0.4,
        };
      });

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
              text: 'Top 5 Server Connection Rate (Real-time)',
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
