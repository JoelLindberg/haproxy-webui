import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/serverAuth";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") ?? "";
    const match = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("haproxy_auth="));
    if (!match) return NextResponse.json({ user: null });
    const token = match.split("=")[1];
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: payload.sub, email: payload.email, name: payload.name ?? null } });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}