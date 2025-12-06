"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // debug logging for dev
      console.log("signin response status:", response.status);
      const text = await response.text();
      try {
        console.log("signin response json:", JSON.parse(text));
      } catch {
        console.log("signin response text:", text);
      }

      if (!response.ok) {
        // try to extract JSON message if present, otherwise show text
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg = j?.error ?? j?.message ?? JSON.stringify(j);
        } catch {}
        throw new Error(msg || `status ${response.status}`);
      }

      // success — navigate to admin
      router.push("/admin");
    } catch (err) {
      console.error("login error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // optional quick test to check API reachability
  const testPing = async () => {
    try {
      const r = await fetch("/api/ping");
      const j = await r.json();
      alert(`ping: ${r.status} ${JSON.stringify(j)}`);
    } catch (e) {
      alert(String(e));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>HAProxy Web UI</h1>
        <p className={styles.subtitle}>Manage your HAProxy backends</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.group}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.group}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
            <button
              type="button"
              onClick={testPing}
              className={styles.button}
              style={{ background: "#6b7280" }}
            >
              Ping API
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}