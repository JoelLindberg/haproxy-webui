"use client";

import { useState, useEffect } from "react";
import styles from "../admin.module.css";

interface ManageServerProps {
  backendName: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
  onSuccess?: () => void;
  refreshTrigger?: number;
}

interface Server {
  name: string;
}

type Action = "rename" | "state" | "delete";

export default function ManageServer({ backendName, onMessage, onSuccess, refreshTrigger }: ManageServerProps) {
  const [selectedServer, setSelectedServer] = useState("");
  const [action, setAction] = useState<Action>("rename");
  const [newServerName, setNewServerName] = useState("");
  const [serverState, setServerState] = useState("ready");
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);
  const [fetchingServers, setFetchingServers] = useState(true);

  // Fetch servers on component mount and when refreshTrigger changes
  useEffect(() => {
    const fetchServers = async () => {
      setFetchingServers(true);
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
  }, [backendName, refreshTrigger]);

  const refreshServers = async () => {
    const res = await fetch(`/api/haproxy/backend/servers?parentName=${encodeURIComponent(backendName)}`);
    if (res.ok) {
      const data = await res.json();
      setServers(Array.isArray(data) ? data : []);
    }
  };

  const handleRename = async () => {
    if (!newServerName) {
      onMessage({ type: "error", text: "Please provide a new name" });
      return;
    }

    const res = await fetch("/api/haproxy/backend/servers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backendName,
        oldName: selectedServer,
        newName: newServerName,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `Failed to rename server: ${res.status}`);
    }

    onMessage({ type: "success", text: `Server renamed from "${selectedServer}" to "${newServerName}"` });
    setSelectedServer("");
    setNewServerName("");
  };

  const handleStateChange = async () => {
    const res = await fetch("/api/haproxy/backend/servers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backendName,
        serverName: selectedServer,
        adminState: serverState,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `Failed to change server state: ${res.status}`);
    }

    const stateLabels: Record<string, string> = {
      ready: "Ready",
      drain: "Drain",
      maint: "Maintenance",
    };

    onMessage({ type: "success", text: `Server "${selectedServer}" state changed to "${stateLabels[serverState]}"` });
  };

  const handleDelete = async () => {
    const res = await fetch("/api/haproxy/backend/servers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backendName,
        name: selectedServer,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `Failed to delete server: ${res.status}`);
    }

    onMessage({ type: "success", text: `Server "${selectedServer}" deleted successfully` });
    setSelectedServer("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServer) {
      onMessage({ type: "error", text: "Please select a server" });
      return;
    }

    setLoading(true);

    try {
      switch (action) {
        case "rename":
          await handleRename();
          break;
        case "state":
          await handleStateChange();
          break;
        case "delete":
          await handleDelete();
          break;
      }

      await refreshServers();
      onSuccess?.();
    } catch (err) {
      onMessage({ type: "error", text: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) {
      switch (action) {
        case "rename": return "Renaming...";
        case "state": return "Updating...";
        case "delete": return "Deleting...";
      }
    }
    switch (action) {
      case "rename": return "Rename Server";
      case "state": return "Update State";
      case "delete": return "Delete Server";
    }
  };

  return (
    <div className={styles.formSection}>
      <h3>Manage Server</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="manageServer">Select Server *</label>
          <select
            id="manageServer"
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

        {selectedServer && (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="action">Action *</label>
              <select
                id="action"
                value={action}
                onChange={(e) => setAction(e.target.value as Action)}
                className={styles.select}
              >
                <option value="rename">Rename</option>
                <option value="state">Change State</option>
                <option value="delete">Delete</option>
              </select>
            </div>

            {action === "rename" && (
              <div className={styles.formGroup}>
                <label htmlFor="newServerName">New Server Name *</label>
                <input
                  type="text"
                  id="newServerName"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Enter new server name"
                  required
                  className={styles.input}
                />
              </div>
            )}

            {action === "state" && (
              <div className={styles.formGroup}>
                <label htmlFor="serverState">State *</label>
                <select
                  id="serverState"
                  value={serverState}
                  onChange={(e) => setServerState(e.target.value)}
                  className={styles.select}
                >
                  <option value="ready">Ready</option>
                  <option value="drain">Drain</option>
                  <option value="maint">Maintenance</option>
                </select>
              </div>
            )}

            {action === "delete" && (
              <div className={styles.warningText}>
                This will permanently remove the server from the backend.
              </div>
            )}

            <button
              type="submit"
              className={`${styles.button} ${action === "delete" ? styles.dangerButton : ""}`}
              disabled={loading || !selectedServer}
            >
              {getButtonText()}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
