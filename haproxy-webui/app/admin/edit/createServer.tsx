"use client";

import { useState } from "react";
import styles from "../admin.module.css";

interface CreateServerProps {
  backendName: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}

export default function CreateServer({ backendName, onMessage }: CreateServerProps) {
  const [serverName, setServerName] = useState("");
  const [serverAddress, setServerAddress] = useState("");
  const [serverPort, setServerPort] = useState("80");
  const [healthCheck, setHealthCheck] = useState("enabled");
  const [loading, setLoading] = useState(false);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serverName || !serverAddress || !serverPort) {
      onMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/haproxy/backend/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backendName,
          name: serverName,
          address: serverAddress,
          port: parseInt(serverPort, 10),
          check: healthCheck === "enabled",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        onMessage({ 
          type: "error", 
          text: data.message || `Failed to create server: ${res.status}` 
        });
        return;
      }
      
      onMessage({ type: "success", text: `Server "${serverName}" created successfully` });
      setServerName("");
      setServerAddress("");
      setServerPort("80");
      setHealthCheck("enabled");
    } catch (err) {
      onMessage({ type: "error", text: `Failed to create server: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formSection}>
      <h3>Create Server</h3>
      <form onSubmit={handleCreateServer} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="serverName">Server Name *</label>
          <input
            type="text"
            id="serverName"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="e.g., app1"
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="serverAddress">Address *</label>
          <input
            type="text"
            id="serverAddress"
            value={serverAddress}
            onChange={(e) => setServerAddress(e.target.value)}
            placeholder="e.g., http-echo1 or 192.168.1.10"
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="serverPort">Port *</label>
          <input
            type="number"
            id="serverPort"
            value={serverPort}
            onChange={(e) => setServerPort(e.target.value)}
            min="1"
            max="65535"
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="healthCheck">Health Check</label>
          <select
            id="healthCheck"
            value={healthCheck}
            onChange={(e) => setHealthCheck(e.target.value)}
            className={styles.select}
          >
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "Creating..." : "Create Server"}
        </button>
      </form>
    </div>
  );
}
