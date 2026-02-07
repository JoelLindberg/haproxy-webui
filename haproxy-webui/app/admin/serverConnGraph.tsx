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
  currentConnections: number;
}

export default function ServerConnGraph() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ timestamp: string; data: ServerConnection[] }[]>([]);
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
      setData(json);
      setError(null);

      // Parse server connections
      const connections = parseServerConnections(json);
      const timestamp = new Date().toLocaleTimeString();
      
      setHistory(prev => {
        const newHistory = [...prev, { timestamp, data: connections }];
        // Keep last 20 data points
        return newHistory.slice(-20);
      });
    } catch (err) {
      setError(`Error fetching metrics: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const parseServerConnections = (metricsData: MetricsResponse): ServerConnection[] => {
    const connections: ServerConnection[] = [];
    
    // Find server current connections metric
    const serverConnMetric = metricsData.metrics.find(
      m => m.name === "haproxy_server_current_sessions" || 
           m.name === "haproxy_server_connections_total"
    );

    if (serverConnMetric) {
      serverConnMetric.metrics.forEach(sample => {
        const serverName = sample.labels.server || "unknown";
        const backend = sample.labels.proxy || "unknown";
        const value = parseInt(sample.value) || 0;

        if (serverName !== "BACKEND" && serverName !== "FRONTEND") {
          connections.push({
            name: `${backend}/${serverName}`,
            backend,
            currentConnections: value,
          });
        }
      });
    }

    // Sort by connections and get top 5
    return connections
      .sort((a, b) => b.currentConnections - a.currentConnections)
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

      // Get unique server names from all history
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

      const datasets = serverNames.map((serverName, idx) => ({
        label: serverName,
        data: history.map(h => {
          const server = h.data.find(d => d.name === serverName);
          return server ? server.currentConnections : 0;
        }),
        borderColor: colors[idx],
        backgroundColor: colors[idx].replace('0.8', '0.4'),
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
          plugins: {
            title: {
              display: true,
              text: 'Top 5 Server Connections (Real-time)',
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
                text: 'Connections',
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
