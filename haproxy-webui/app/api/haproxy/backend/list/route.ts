import { NextResponse } from "next/server";
import { ensureAuthenticated } from "@/lib/serverAuth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/haproxy/backend/list
 * Fetches all backend names from the database.
 */
export async function GET(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  try {
    const result = await db.execute(
      sql`SELECT id, name, created_at, updated_at FROM haproxy_backends ORDER BY created_at DESC`
    );

    // Drizzle with mysql2 returns [rows, fields], we want the rows
    const backends = Array.isArray(result[0]) ? result[0] : [];

    return NextResponse.json({
      backends,
      count: backends.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "database_error", message: String(err) },
      { status: 500 }
    );
  }
}
