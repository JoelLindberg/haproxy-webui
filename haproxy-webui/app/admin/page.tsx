"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import BackendCreate from "./backendCreate";
import BackendsList from "./backendsList";
import Diagnostics from "./diagnostics";
import AdminHeader from "./adminHeader";

interface User {
  id?: string;
  email?: string;
  name?: string;
}

interface Backend {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        if (!json.user) {
          router.push("/login");
          return;
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleBackendCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <AdminHeader />

      <main className={styles.main}>

        <BackendsList key={refreshKey} />

        <section className={styles.section}>
          <h2>Metrics</h2>
          <div className={styles.placeholder}>
            <p>Metrics dashboard coming soon...</p>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Create Backend</h2>
          <BackendCreate onBackendCreated={handleBackendCreated} />
        </section>

        <section className={styles.section}>
          <h2>Diagnostics</h2>
          <Diagnostics />
        </section>

      </main>
    </div>
  );
}