"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";

interface DeleteBackendProps {
  backendName: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}

export default function DeleteBackend({ backendName, onMessage }: DeleteBackendProps) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDeleteBackend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (confirmName !== backendName) {
      onMessage({ type: "error", text: "Backend name does not match. Please type the exact name to confirm." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/haproxy/backend", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: backendName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        onMessage({
          type: "error",
          text: data.message || `Failed to delete backend: ${res.status}`,
        });
        return;
      }

      onMessage({ type: "success", text: `Backend "${backendName}" deleted successfully` });
      
      // Redirect to admin page after successful deletion
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch (err) {
      onMessage({ type: "error", text: `Failed to delete backend: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.dangerZone}>
      <h3>Danger Zone</h3>
      <p className={styles.dangerText}>
        Permanently delete this backend including all servers and settings. This action cannot be undone.
      </p>
      <form onSubmit={handleDeleteBackend} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="confirmBackendName">
            Type <strong>{backendName}</strong> to confirm
          </label>
          <input
            type="text"
            id="confirmBackendName"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={backendName}
            className={styles.input}
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className={`${styles.button} ${styles.dangerButton}`}
          disabled={loading || confirmName !== backendName}
        >
          {loading ? "Deleting..." : "Delete Backend"}
        </button>
      </form>
    </div>
  );
}
