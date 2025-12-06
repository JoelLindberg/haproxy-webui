import jwt from "jsonwebtoken";
import { compare } from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SECRET = process.env.BETTER_AUTH_SECRET ?? "dev-secret";
const COOKIE_NAME = "haproxy_auth";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export type AuthUser = { id: string; email: string; name?: string };

async function getConn() {
  return mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "3306"),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "haproxy_webui",
  });
}

export async function authenticateEmail(email: string, password: string): Promise<AuthUser | null> {
  const conn = await getConn();
  const [rows]: any = await conn.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  await conn.end();
  const user = rows?.[0];
  if (!user) return null;
  const ok = await compare(password, user.password);
  if (!ok) return null;
  return { id: user.id, email: user.email, name: user.name ?? undefined };
}

export function createToken(user: AuthUser) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, SECRET, {
    expiresIn: COOKIE_MAX_AGE,
  });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET) as { sub: string; email: string; name?: string; iat?: number; exp?: number };
  } catch {
    return null;
  }
}

export const cookieOptions = {
  name: COOKIE_NAME,
  maxAge: COOKIE_MAX_AGE,
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};