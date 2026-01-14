"use client";

import { useState } from "react";
import styles from "./admin.module.css";

interface BackendCreateProps {
  onBackendCreated?: () => void;
}

export default function BackendCreate({ onBackendCreated }: BackendCreateProps) {
  const [backendName, setBackendName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/haproxy/backend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: backendName }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to create backend");
        return;
      }

      setSuccess(true);
      setBackendName("");
      
      // Trigger callback to refresh backends list
      if (onBackendCreated) {
        onBackendCreated();
      }
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Error creating backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="backendName" className={styles.label}>
            Backend Name
          </label>
          <input
            type="text"
            id="backendName"
            value={backendName}
            onChange={(e) => setBackendName(e.target.value)}
            className={styles.input}
            placeholder="Enter backend name"
            required
            disabled={loading}
          />
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && (
          <div className={styles.successMessage}>
            Backend created successfully!
          </div>
        )}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading || !backendName.trim()}
        >
          {loading ? "Creating..." : "Create Backend"}
        </button>
      </form>
    </div>
  );
}
