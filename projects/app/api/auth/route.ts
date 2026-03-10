import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import {
  isRateLimited,
  recordFailedAttempt,
  resetAttempts,
} from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Check rate limit before doing anything
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { password } = body;
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 }
    );
  }

  if (!verifyPassword(password)) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  // Success — reset rate limit and set session cookie
  resetAttempts(ip);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response);
  return response;
}
