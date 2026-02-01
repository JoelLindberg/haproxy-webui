"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import styles from "./admin.module.css";

export default function AdminHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (isPending) {
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
        <p className={styles.userInfo}>Logged in as: {session?.user?.email}</p>
      </div>
      <button onClick={handleLogout} className={styles.logoutBtn}>
        Logout
      </button>
    </header>
  );
}
