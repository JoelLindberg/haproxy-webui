import { betterAuth } from "better-auth";
import { createPool } from "mysql2/promise";

// Create MySQL connection pool for Better Auth
const pool = createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "3306"),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "haproxy_webui",
  timezone: "Z", // Important for consistent timezone
});

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    // Disable public sign-up - users must be added manually via CLI or database
    signUpEnabled: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (refresh session if older than this)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
});

// Export the auth type for client-side type inference
export type Auth = typeof auth;