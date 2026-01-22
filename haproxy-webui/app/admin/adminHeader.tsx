"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

interface User {
  id?: string;
  email?: string;
  name?: string;
}

export default function AdminHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>HAProxy Admin</h1>
          <p className={styles.userInfo}>Loading...</p>
        </div>
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>HAProxy Admin</h1>
        <p className={styles.userInfo}>Logged in as: {user?.email}</p>
      </div>
      <button onClick={handleLogout} className={styles.logoutBtn}>
        Logout
      </button>
    </header>
  );
}
