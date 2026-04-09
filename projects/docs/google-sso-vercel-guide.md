# Google SSO Authentication on Vercel (Next.js)

A step-by-step guide to set up Google Sign-In with email-based access control using **NextAuth.js v5** on **Vercel**.

---

## What you get

- Google OAuth login with a single "Sign in with Google" button
- Only specific email addresses can access the app (whitelist)
- All routes protected by default (middleware-based)
- Works on Vercel out of the box

---

## 1. Install dependencies

```bash
npm install next-auth@beta
```

> This uses **NextAuth.js v5** (beta), which supports Next.js App Router natively.

---

## 2. Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Application type: **Web application**
6. Add **Authorized redirect URIs**:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**

---

## 3. Set up environment variables

Create a `.env.local` file:

```bash
# Google OAuth credentials (from step 2)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Auth.js secret — generate one with: npx auth secret
AUTH_SECRET=your-random-secret-string

# Comma-separated list of allowed Google emails
ALLOWED_EMAILS=alice@company.com,bob@company.com
```

On Vercel, add these same variables in **Settings > Environment Variables**.

> `AUTH_SECRET` can be any random string. Generate one with `npx auth secret` or `openssl rand -base64 32`.

---

## 4. Auth configuration

Create `lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS;
  if (!raw) {
    throw new Error("ALLOWED_EMAILS must be set");
  }
  return raw.split(",").map((e) => e.trim().toLowerCase());
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Only allow specific emails to sign in
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      return getAllowedEmails().includes(email);
    },
    // Protect all routes except /login and /api/auth
    async authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
        return true;
      }
      return isLoggedIn;
    },
    async session({ session }) {
      return session;
    },
  },
});
```

**What this does:**
- `signIn` callback checks the Google email against your whitelist
- `authorized` callback protects all routes by default
- `/login` and `/api/auth/*` are always public
- Everything else requires authentication

---

## 5. Route handler

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

This handles all OAuth callbacks (redirect from Google, session management, etc.).

---

## 6. Middleware

Create `middleware.ts` at the project root:

```typescript
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
```

This runs the auth check on every request except static assets, the login page, and auth API routes.

---

## 7. Login page

Create `app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <div>
        <h1>Sign In</h1>
        <p>Sign in with Google to continue.</p>
        <button onClick={handleGoogleSignIn} disabled={loading}>
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
```

---

## 8. Sign out

Anywhere in your app, use:

```tsx
import { signOut } from "next-auth/react";

<button onClick={() => signOut({ callbackUrl: "/login" })}>
  Sign out
</button>
```

---

## 9. Protect API routes (server-side)

In any API route, check the session:

```typescript
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... your logic
}
```

---

## File structure recap

```
├── lib/
│   └── auth.ts                          # Auth config + callbacks
├── middleware.ts                         # Route protection
├── app/
│   ├── api/auth/[...nextauth]/route.ts  # OAuth handler
│   ├── login/page.tsx                   # Login page
│   └── ...                              # Protected pages
└── .env.local                           # Secrets
```

---

## How the flow works

```
1. User visits any page
2. Middleware checks if they have a session
3. No session → redirect to /login
4. User clicks "Sign in with Google"
5. Google OAuth flow happens
6. NextAuth checks their email against ALLOWED_EMAILS
7. Email allowed → session created → redirect to app
8. Email not allowed → redirect back to /login with error
```

---

## Adding a new user

Just add their Google email to the `ALLOWED_EMAILS` environment variable on Vercel:

```
ALLOWED_EMAILS=alice@company.com,bob@company.com,newperson@company.com
```

Redeploy (or it picks up on next deployment).

---

## Common issues

| Issue | Fix |
|---|---|
| "Redirect URI mismatch" | Add your exact callback URL in Google Cloud Console |
| Sign-in fails silently | Check that the email is in `ALLOWED_EMAILS` (case-insensitive) |
| Works locally but not on Vercel | Make sure `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are set in Vercel env vars |
| Infinite redirect loop | Check that `/login` and `/api/auth` are excluded in the middleware matcher |

---

## Dependencies

```json
{
  "next": "^15.x",
  "next-auth": "^5.0.0-beta.30",
  "react": "^19.x"
}
```
