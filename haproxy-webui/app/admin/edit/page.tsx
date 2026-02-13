"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import styles from "../admin.module.css";
import CreateServer from "./createServer";
import ManageServer from "./manageServer";
import DeleteBackend from "./deleteBackend";
import AdminHeader from "../adminHeader";
import BackendDetails from "../backendDetails";
import ServerConnGraph from "../metrics/serverConnGraph";

function EditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backend = searchParams.get("backend");
  const { data: session, isPending } = useSession();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        <h1>Edit</h1>
        <div className={styles.placeholder}>
          No backend specified. Please select a backend to edit.
        </div>
        <Link href="/admin" className={styles.button}>
          Back to Admin
        </Link>
      </div>
    );
  }

  const handleMessage = (msg: { type: "success" | "error"; text: string }) => {
    setMessage(msg);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className={styles.container}>
      <AdminHeader />
      
      <Link href="/admin" className={styles.backLink}>
        <span className={styles.backIcon}>←</span>
        <span>Back to Admin</span>
      </Link>

      <div className={styles.panel}>
        <h2>Server Management - {backend}</h2>
        
        {message && (
          <div className={`${styles.message} ${message.type === "success" ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        <div className={styles.editGrid}>
          <div className={styles.editLeft}>
            <CreateServer backendName={backend} onMessage={handleMessage} onSuccess={handleRefresh} />
            <ManageServer backendName={backend} onMessage={handleMessage} onSuccess={handleRefresh} refreshTrigger={refreshTrigger} />
            <DeleteBackend backendName={backend} onMessage={handleMessage} />
          </div>
          <div className={styles.editRight}>
            <BackendDetails backendName={backend} refreshTrigger={refreshTrigger} />
            <div style={{ marginTop: "2rem" }}>
              <ServerConnGraph backendName={backend} refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditContent />
    </Suspense>
  );
}
