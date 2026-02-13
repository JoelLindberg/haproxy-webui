"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./admin.module.css";
import BackendDetails from "./backendDetails";

interface Backend {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function BackendsList() {
  const [backends, setBackends] = useState<Backend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/haproxy/backend/list")
      .then((res) => res.json())
      .then((json) => {
        setBackends(json.backends || []);
      })
      .catch((err) => {
        console.error("Failed to fetch backends:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className={styles.section}>
        <h2>Backends</h2>
        <div className={styles.placeholder}>Loading backends...</div>
      </section>
    );
  }

  if (backends.length === 0) {
    return (
      <section className={styles.section}>
        <h2>Backends</h2>
        <div className={styles.placeholder}>
          <p>No backends found. Create one above to get started.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      {backends.map((backend) => (
        <section key={backend.id} className={styles.section}>
          <h2>
            Backend: {backend.name}
            <Link
              href={`/admin/edit?backend=${encodeURIComponent(backend.name)}`}
              style={{
                marginLeft: "0.5rem",
                fontSize: "0.8em",
                textDecoration: "none",
                opacity: 0.7,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
              title="Edit servers"
            >
              ✏️
            </Link>
            <Link
              href={`/admin/metrics?backend=${encodeURIComponent(backend.name)}`}
              style={{
                marginLeft: "0.5rem",
                fontSize: "0.8em",
                textDecoration: "none",
                opacity: 0.7,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
              title="View metrics"
            >
              📊
            </Link>
          </h2>
          <BackendDetails backendName={backend.name} />
        </section>
      ))}
    </>
  );
}
