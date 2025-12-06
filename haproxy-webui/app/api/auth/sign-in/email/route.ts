import { NextResponse } from "next/server";
import { authenticateEmail, createToken, cookieOptions } from "@/lib/serverAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};
    if (!email || !password) {
      return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
    }

    const user = await authenticateEmail(email, password);
    if (!user) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

    const token = createToken(user);

    const res = NextResponse.json({ ok: true });
    // set cookie
    res.headers.append(
      "Set-Cookie",
      `${cookieOptions.name}=${token}; Max-Age=${cookieOptions.maxAge}; Path=${cookieOptions.path}; HttpOnly; SameSite=${cookieOptions.sameSite}${cookieOptions.secure ? "; Secure" : ""}`
    );
    return res;
  } catch (err) {
    return NextResponse.json({ error: "server_error", message: String(err) }, { status: 500 });
  }
}