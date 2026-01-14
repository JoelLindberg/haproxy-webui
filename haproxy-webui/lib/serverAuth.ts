import jwt from "jsonwebtoken";
import { compare } from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { NextResponse } from "next/server";

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

// Ensure this file exports cookieOptions and createToken already (they exist).
// Add a small helper to enforce authentication for API routes.
// This simple helper returns a NextResponse(401) when the cookie is missing,
// otherwise returns null so route code can continue.
// If you have token verification logic, replace the commented section below
// with a call to your verify/parse function.
export function ensureAuthenticated(req: Request) : NextResponse | null {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const name = (typeof cookieOptions !== "undefined" && cookieOptions.name) ? cookieOptions.name : "token";
    const m = cookieHeader.match(new RegExp(`${name}=([^;\\s]+)`));
    const token = m?.[1];

    if (!token) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // If you have a verifyToken or getUserFromToken function, call it here:
    // try {
    //   const user = verifyToken(token);
    //   return user; // or attach to the request/context as needed
    // } catch (e) {
    //   return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    // }

    return null;
}