"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import styles from "../admin.module.css";
import AdminHeader from "../adminHeader";
import ServerSessGraph from "./serverSessGraph";
import ServerConnGraph from "./serverConnGraph";

function MetricsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backend = searchParams.get("backend");
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!session) {
    return null; // Will redirect via useEffect
  }

  if (!backend) {
    return (
      <div className={styles.container}>
        <AdminHeader />
        <h1>Metrics</h1>
        <div className={styles.placeholder}>
          No backend specified. Please select a backend to view metrics.
        </div>
        <Link href="/admin" className={styles.button}>
          Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <AdminHeader />
      
      <Link href="/admin" className={styles.backLink}>
        <span className={styles.backIcon}>←</span>
        <span>Back to Admin</span>
      </Link>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2>Session Rate - {backend}</h2>
          <ServerSessGraph backendName={backend} />
        </section>

        <section className={styles.section}>
          <h2>Connection Rate - {backend}</h2>
          <ServerConnGraph backendName={backend} />
        </section>
      </main>
    </div>
  );
}

export default function MetricsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetricsContent />
    </Suspense>
  );
}
