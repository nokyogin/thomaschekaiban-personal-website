/**
 * Edge-compatible session verification using Web Crypto API.
 * Used by middleware (which runs in Edge Runtime).
 */

export const COOKIE_NAME = "session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function hexEncode(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return hexEncode(sig);
}

/** Timing-safe hex string comparison using Web Crypto */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Verify a session cookie value in Edge Runtime */
export async function verifySessionValue(value: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return false;

  const parts = value.split(".");
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - ts > SESSION_MAX_AGE) return false;

  const expectedSignature = await hmacSign(secret, timestamp);
  return timingSafeEqual(signature, expectedSignature);
}
