"use client";

import { useState } from "react";
import styles from "../admin.module.css";

interface ManageServerStateProps {
  backendName: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}

export default function ManageServerState({ backendName, onMessage }: ManageServerStateProps) {
  const [selectedServer, setSelectedServer] = useState("");
  const [serverState, setServerState] = useState("ready");

  const handleChangeState = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServer || !serverState) {
      onMessage({ type: "error", text: "Please select a server and state" });
      return;
    }

    try {
      // TODO: API call to change server state
      console.log("Changing server state:", {
        backendName,
        serverName: selectedServer,
        state: serverState,
      });
      
      onMessage({ type: "success", text: `Server "${selectedServer}" state changed to "${serverState}"` });
    } catch (err) {
      onMessage({ type: "error", text: `Failed to change server state: ${err}` });
    }
  };

  return (
    <div className={styles.formSection}>
      <h3>Manage Server State</h3>
      <form onSubmit={handleChangeState} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="stateServer">Select Server *</label>
          <input
            type="text"
            id="stateServer"
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            placeholder="Enter server name"
            required
            className={styles.input}
          />
        </div>
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
        <button type="submit" className={styles.button}>
          Update State
        </button>
      </form>
    </div>
  );
}
