"use client";

import { useState } from "react";
import styles from "../admin.module.css";

interface RenameServerProps {
  backendName: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}

export default function RenameServer({ backendName, onMessage }: RenameServerProps) {
  const [selectedServer, setSelectedServer] = useState("");
  const [newServerName, setNewServerName] = useState("");

  const handleRenameServer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServer || !newServerName) {
      onMessage({ type: "error", text: "Please select a server and provide a new name" });
      return;
    }

    try {
      // TODO: API call to rename server
      console.log("Renaming server:", {
        backendName,
        oldName: selectedServer,
        newName: newServerName,
      });
      
      onMessage({ type: "success", text: `Server renamed from "${selectedServer}" to "${newServerName}"` });
      setSelectedServer("");
      setNewServerName("");
    } catch (err) {
      onMessage({ type: "error", text: `Failed to rename server: ${err}` });
    }
  };

  return (
    <div className={styles.formSection}>
      <h3>Rename Server</h3>
      <form onSubmit={handleRenameServer} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="renameServer">Current Server Name *</label>
          <input
            type="text"
            id="renameServer"
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            placeholder="Enter current server name"
            required
            className={styles.input}
          />
        </div>
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
        <button type="submit" className={styles.button}>
          Rename Server
        </button>
      </form>
    </div>
  );
}
