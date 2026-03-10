import { cookies } from "next/headers";
import crypto from "crypto";

export const COOKIE_NAME = "session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return secret;
}

function getSitePassword(): string {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    throw new Error("SITE_PASSWORD must be set");
  }
  return password;
}

/** Timing-safe password comparison to prevent timing attacks */
export function verifyPassword(input: string): boolean {
  const expected = getSitePassword();
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);

  if (inputBuf.length !== expectedBuf.length) {
    // Compare against expected anyway to avoid leaking length info via timing
    crypto.timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }

  return crypto.timingSafeEqual(inputBuf, expectedBuf);
}

/** Create a signed session cookie value: timestamp.signature */
export function createSessionValue(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(timestamp)
    .digest("hex");
  return `${timestamp}.${signature}`;
}

/** Verify a session cookie value (Node.js runtime) */
export function verifySessionValue(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - ts > SESSION_MAX_AGE) return false;

  const expectedSignature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(timestamp)
    .digest("hex");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

/** Set the session cookie on a Response */
export function setSessionCookie(response: Response): Response {
  const value = createSessionValue();
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`
  );
  return response;
}

/** Check if the current request has a valid session cookie */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) return false;
  return verifySessionValue(session.value);
}
