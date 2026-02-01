import { NextResponse } from "next/server";
import { auth } from "./auth";
import { headers } from "next/headers";

/**
 * Server-side authentication utilities for Better Auth
 * 
 * This module provides helpers for protecting API routes and server components
 * using Better Auth's session management.
 */

/**
 * Get the current session on the server side.
 * Use this in Server Components or API routes.
 * 
 * @example
 * // In a Server Component
 * const session = await getServerSession();
 * if (!session) redirect("/login");
 * 
 * @example
 * // In an API route
 * export async function GET(req: Request) {
 *   const session = await getServerSession(req);
 *   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 * }
 */
export async function getServerSession(req?: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req ? req.headers : await headers(),
    });
    return session;
  } catch {
    return null;
  }
}

/**
 * Middleware-style helper to enforce authentication for API routes.
 * Returns a 401 NextResponse if unauthenticated, or null if authenticated.
 * 
 * @example
 * export async function GET(req: Request) {
 *   const authError = await ensureAuthenticated(req);
 *   if (authError) return authError;
 *   
 *   // User is authenticated, proceed with the request
 *   return NextResponse.json({ data: "protected" });
 * }
 */
export async function ensureAuthenticated(req: Request): Promise<NextResponse | null> {
  const session = await getServerSession(req);

  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  return null;
}

/**
 * Get the current user from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(req?: Request) {
  const session = await getServerSession(req);
  return session?.user ?? null;
}

// Re-export auth for convenience
export { auth } from "./auth";