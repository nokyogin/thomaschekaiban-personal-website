const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, RateLimitEntry>();

/** Clean up expired entries to prevent memory leaks */
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now > entry.resetAt) {
      attempts.delete(key);
    }
  }
}

/** Check if an IP is rate-limited. Returns true if the request should be blocked. */
export function isRateLimited(ip: string): boolean {
  cleanup();

  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    return false;
  }

  return entry.count >= MAX_ATTEMPTS;
}

/** Record a failed attempt for an IP */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

/** Reset attempts for an IP (on successful login) */
export function resetAttempts(ip: string): void {
  attempts.delete(ip);
}
