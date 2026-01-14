"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import BackendCreate from "./backendCreate";
import BackendsList from "./backendsList";
import Diagnostics from "./diagnostics";

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
  const [user, setUser] = useState<User | null>(null);
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
        setUser(json.user);
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

  const handleLogout = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/login");
  };


  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>HAProxy Admin</h1>
          <p className={styles.userInfo}>Logged in as: {user?.email}</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2>Create Backend</h2>
          <BackendCreate onBackendCreated={handleBackendCreated} />
        </section>

        <BackendsList key={refreshKey} />

        <section className={styles.section}>
          <h2>Metrics</h2>
          <div className={styles.placeholder}>
            <p>Metrics dashboard coming soon...</p>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Diagnostics</h2>
          <Diagnostics />
        </section>
      </main>
    </div>
  );
}