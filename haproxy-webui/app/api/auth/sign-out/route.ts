import { NextResponse } from "next/server";
import { cookieOptions } from "@/lib/serverAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${cookieOptions.name}=; Max-Age=0; Path=${cookieOptions.path}; HttpOnly; SameSite=${cookieOptions.sameSite}${cookieOptions.secure ? "; Secure" : ""}`
  );
  return res;
}