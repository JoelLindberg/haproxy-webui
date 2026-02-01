import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * LLMs.txt endpoint - Provides authentication documentation in a format optimized for AI models
 * Based on Better Auth's LLM support feature
 */
export async function GET() {
  const content = `# HAProxy WebUI Authentication

> Authentication system powered by Better Auth for HAProxy WebUI

## Overview

This application uses Better Auth for authentication with the following configuration:
- Email and password authentication enabled
- MySQL database with Drizzle ORM adapter
- Session-based authentication with database-backed sessions
- Next.js App Router integration

## File Structure

\`\`\`
lib/
├── auth.ts          # Better Auth server configuration
├── auth-client.ts   # Better Auth client for React components
├── serverAuth.ts    # Server-side auth utilities (ensureAuthenticated, getServerSession)
└── db.ts            # Drizzle ORM database connection
\`\`\`

## Authentication Endpoints

All authentication endpoints are handled by Better Auth at \`/api/auth/*\`.

### Sign In

**Endpoint:** POST \`/api/auth/sign-in/email\`

**Client Side (using auth-client.ts):**
\`\`\`ts
import { signIn } from "@/lib/auth-client";

const { data, error } = await signIn.email({
    email: "user@example.com",
    password: "your-password"
});
\`\`\`

**Server Side:**
\`\`\`ts
import { auth } from "@/lib/auth";

const result = await auth.api.signInEmail({
    body: {
        email: "user@example.com",
        password: "your-password"
    }
});
\`\`\`

### Sign Up

**Endpoint:** POST \`/api/auth/sign-up/email\`

**Client Side:**
\`\`\`ts
import { signUp } from "@/lib/auth-client";

const { data, error } = await signUp.email({
    email: "user@example.com",
    password: "your-password",
    name: "User Name" // optional
});
\`\`\`

### Sign Out

**Endpoint:** POST \`/api/auth/sign-out\`

**Client Side:**
\`\`\`ts
import { signOut } from "@/lib/auth-client";

await signOut();
\`\`\`

### Get Session

**Endpoint:** GET \`/api/auth/get-session\`

**Client Side (React hook):**
\`\`\`ts
import { useSession } from "@/lib/auth-client";

function MyComponent() {
  const { data: session, isPending } = useSession();
  
  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;
  
  return <div>Hello, {session.user.email}</div>;
}
\`\`\`

**Server Side:**
\`\`\`ts
import { getServerSession } from "@/lib/serverAuth";

const session = await getServerSession(req);
\`\`\`

## Server Configuration

### lib/auth.ts

\`\`\`typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],
});
\`\`\`

### lib/auth-client.ts

\`\`\`typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
\`\`\`

## Protected Routes

### Client-Side Protection (React Components)

\`\`\`typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export default function ProtectedPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) return <div>Loading...</div>;
  if (!session) return null;

  return <div>Protected content for {session.user.email}</div>;
}
\`\`\`

### API Route Protection

\`\`\`typescript
import { NextResponse } from "next/server";
import { ensureAuthenticated } from "@/lib/serverAuth";

export async function GET(req: Request) {
  // Returns 401 response if not authenticated, or null if authenticated
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  // User is authenticated, proceed
  return NextResponse.json({ data: "Protected data" });
}
\`\`\`

### Server Component Protection

\`\`\`typescript
import { getServerSession } from "@/lib/serverAuth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedServerPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <div>Hello, {session.user.email}</div>;
}
\`\`\`

## Database Schema

Better Auth automatically manages these tables:

### user Table
- \`id\`: string (primary key)
- \`email\`: string (unique)
- \`emailVerified\`: boolean
- \`name\`: string (optional)
- \`image\`: string (optional)
- \`createdAt\`: timestamp
- \`updatedAt\`: timestamp

### session Table
- \`id\`: string (primary key)
- \`userId\`: string (foreign key)
- \`expiresAt\`: timestamp
- \`token\`: string (unique)
- \`ipAddress\`: string (optional)
- \`userAgent\`: string (optional)

### account Table
- \`id\`: string (primary key)
- \`userId\`: string (foreign key)
- \`accountId\`: string
- \`providerId\`: string
- \`password\`: string (hashed, for email/password)

## Environment Variables

Required:
- \`BETTER_AUTH_SECRET\`: Secret key for signing (required in production)
- \`BETTER_AUTH_URL\`: Base URL of your application
- \`NEXT_PUBLIC_APP_URL\`: Public URL for client-side auth

Database:
- \`DB_HOST\`: MySQL host (default: localhost)
- \`DB_PORT\`: MySQL port (default: 3306)
- \`DB_USER\`: MySQL user (default: root)
- \`DB_PASSWORD\`: MySQL password
- \`DB_NAME\`: MySQL database name (default: haproxy_webui)

## Security Features

- **Password Hashing**: Automatic bcrypt hashing
- **CSRF Protection**: Built into Better Auth
- **Session Management**: Database-backed sessions with automatic expiry
- **Cookie Security**: HttpOnly, SameSite=lax, Secure in production
- **Session Caching**: 5-minute cookie cache to reduce database queries

## Database Migration

Run the Better Auth CLI to generate/update database schema:

\`\`\`bash
npx @better-auth/cli generate
npx @better-auth/cli migrate
\`\`\`

## Additional Resources

- [Better Auth Documentation](https://better-auth.com/docs)
- [Better Auth Next.js Integration](https://better-auth.com/docs/integrations/next)
- [Drizzle ORM](https://orm.drizzle.team/)
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
