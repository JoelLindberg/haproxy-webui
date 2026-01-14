import dotenv from "dotenv";
import path from "path";
import mysql from "mysql2/promise";
import { hash } from "bcryptjs";

// load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_PORT = parseInt(process.env.DB_PORT ?? "3306");
const DB_USER = process.env.DB_USER ?? "root";
const DB_PASS = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME ?? "haproxy_webui";

const ADMIN_ID = process.env.ADMIN_ID ?? "admin-user-1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@haproxy.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

async function run() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    multipleStatements: true,
  });

  // Create DB if missing and use it
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
  await conn.query(`USE \`${DB_NAME}\`;`);

  // NOTE: adjust the table name/columns to match better-auth's schema if different.
  // This creates a simple users table suitable for an email+password flow.
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) DEFAULT NULL,
      password VARCHAR(255) NOT NULL,
      email_verified DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create haproxy_backends table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS haproxy_backends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const hashed = await hash(ADMIN_PASSWORD, 10);
  const now = new Date();

  // Upsert admin user
  await conn.query(
    `
    INSERT INTO users (id, email, name, password, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password = VALUES(password),
      email_verified = VALUES(email_verified),
      updated_at = VALUES(updated_at)
  `,
    [ADMIN_ID, ADMIN_EMAIL, "Admin", hashed, now, now, now]
  );

  console.log(`✓ Admin user created/updated: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  // Seed default backends
  await conn.query(
    `
    INSERT INTO haproxy_backends (name, created_at, updated_at)
    VALUES (?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      updated_at = VALUES(updated_at)
  `,
    ["db_be"]
  );

  await conn.query(
    `
    INSERT INTO haproxy_backends (name, created_at, updated_at)
    VALUES (?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      updated_at = VALUES(updated_at)
  `,
    ["app_be"]
  );

  console.log(`✓ Default backends created/updated: db_be, app_be`);

  await conn.end();
}

run().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});