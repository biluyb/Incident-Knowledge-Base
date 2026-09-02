/**
 * In-Memory Sliding Window Rate Limiter
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check if a key (e.g. IP or email) has exceeded rate limits.
 * @param key Unique identifier
 * @param limit Max allowed attempts in window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number = 5, windowMs: number = 15 * 60 * 1000): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  store.set(key, entry);
  return { allowed: true };
}

/**
 * Reset rate limit counter for a key upon successful action.
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
