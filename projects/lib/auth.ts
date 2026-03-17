import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS;
  if (!raw) {
    throw new Error("ALLOWED_EMAILS must be set (comma-separated list of allowed Google emails)");
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
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      const allowed = getAllowedEmails();
      return allowed.includes(email);
    },
    async authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const { pathname } = request.nextUrl;
      // Allow public paths
      if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
        return true;
      }
      // Block all other routes if not authenticated
      return isLoggedIn;
    },
    async session({ session }) {
      return session;
    },
  },
});

export const COOKIE_NAME = "session"; // kept for compatibility
