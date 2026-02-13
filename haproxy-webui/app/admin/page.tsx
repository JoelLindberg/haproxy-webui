"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import styles from "./admin.module.css";
import BackendCreate from "./backendCreate";
import BackendsList from "./backendsList";
import Diagnostics from "./diagnostics";
import Metrics from "./metrics";
import AdminHeader from "./adminHeader";
import TopServerConnGraph from "./topServerConnGraph";
import MetricsRaw from "./metricsRaw";

interface Backend {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  const handleBackendCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isPending) return <div className={styles.container}>Loading...</div>;
  
  if (!session) return null; // Will redirect via useEffect

  return (
    <div className={styles.container}>
      <AdminHeader />

      <section className={styles.fullWidthSection}>
        <h2>Server Connections</h2>
        <TopServerConnGraph />
      </section>

      <main className={styles.main}>

        <BackendsList key={refreshKey} />

        <section className={styles.section}>
          <h2>Diagnostics</h2>
          <Diagnostics />
        </section>

        <section className={styles.section}>
          <h2>Metrics</h2>
          <Metrics />
        </section>

        <section className={styles.section}>
          <h2>Metrics Raw</h2>
          <MetricsRaw />
        </section>

        <section className={styles.section}>
          <h2>Create Backend</h2>
          <BackendCreate onBackendCreated={handleBackendCreated} />
        </section>

      </main>
    </div>
  );
}