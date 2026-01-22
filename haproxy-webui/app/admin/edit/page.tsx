"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import styles from "../admin.module.css";
import CreateServer from "./createServer";
import DeleteServer from "./deleteServer";
import RenameServer from "./renameServer";
import ManageServerState from "./manageServerState";
import AdminHeader from "../adminHeader";

function EditContent() {
  const searchParams = useSearchParams();
  const backend = searchParams.get("backend");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
          <CreateServer backendName={backend} onMessage={handleMessage} />
          <DeleteServer backendName={backend} onMessage={handleMessage} />
          <RenameServer backendName={backend} onMessage={handleMessage} />
          <ManageServerState backendName={backend} onMessage={handleMessage} />
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
