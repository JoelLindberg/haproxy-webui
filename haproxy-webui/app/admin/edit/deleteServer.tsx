"use client";

import { useState, useEffect } from "react";
import styles from "../admin.module.css";

interface DeleteServerProps {
  backendName: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}

interface Server {
  name: string;
}

export default function DeleteServer({ backendName, onMessage }: DeleteServerProps) {
  const [selectedServer, setSelectedServer] = useState("");
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);
  const [fetchingServers, setFetchingServers] = useState(true);

  // Fetch servers on component mount
  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await fetch(`/api/haproxy/backend/servers?parentName=${encodeURIComponent(backendName)}`);
        if (res.ok) {
          const data = await res.json();
          setServers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch servers:", err);
      } finally {
        setFetchingServers(false);
      }
    };

    fetchServers();
  }, [backendName]);

  const handleDeleteServer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServer) {
      onMessage({ type: "error", text: "Please select a server to delete" });
      return;
    }

    setLoading(true);

    try {
      const deleteRes = await fetch("/api/haproxy/backend/servers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backendName,
          name: selectedServer,
        }),
      });

      const data = await deleteRes.json();

      if (!deleteRes.ok) {
        onMessage({ 
          type: "error", 
          text: data.message || `Failed to delete server: ${deleteRes.status}` 
        });
        return;
      }
      
      onMessage({ type: "success", text: `Server "${selectedServer}" deleted successfully` });
      setSelectedServer("");
      
      // Refresh the server list after deletion
      const refreshRes = await fetch(`/api/haproxy/backend/servers?parentName=${encodeURIComponent(backendName)}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setServers(Array.isArray(refreshData) ? refreshData : []);
      }
    } catch (err) {
      onMessage({ type: "error", text: `Failed to delete server: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formSection}>
      <h3>Delete Server</h3>
      <form onSubmit={handleDeleteServer} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="deleteServer">Select Server *</label>
          <select
            id="deleteServer"
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            required
            className={styles.select}
            disabled={fetchingServers || servers.length === 0}
          >
            <option value="">
              {fetchingServers ? "Loading servers..." : servers.length === 0 ? "No servers available" : "-- Select a server --"}
            </option>
            {servers.map((server) => (
              <option key={server.name} value={server.name}>
                {server.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={`${styles.button} ${styles.dangerButton}`} disabled={loading || !selectedServer}>
          {loading ? "Deleting..." : "Delete Server"}
        </button>
      </form>
    </div>
  );
}
