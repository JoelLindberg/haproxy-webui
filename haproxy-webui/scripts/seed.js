import dotenv from "dotenv";
import path from "path";
import mysql from "mysql2/promise";

// load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_PORT = parseInt(process.env.DB_PORT ?? "3306");
const DB_USER = process.env.DB_USER ?? "root";
const DB_PASS = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME ?? "haproxy_webui";

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

  // NOTE: User/session tables are managed by Better Auth.
  // Run `npx @better-auth/cli migrate` to set up auth tables.
  // Use the sign-up flow to create users.

  // Create haproxy_backends table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS haproxy_backends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

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