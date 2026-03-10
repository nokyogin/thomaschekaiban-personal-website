import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionValue, COOKIE_NAME } from "@/lib/auth-edge";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  const session = request.cookies.get(COOKIE_NAME);
  if (!session?.value || !(await verifySessionValue(session.value))) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
