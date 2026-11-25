/**
 * In-memory guard for anonymous analytics writes.
 *
 * Rate limiting is keyed by the network address and page path, never by the
 * client-provided session ID (which an attacker can rotate on every request).
 * The cache is bounded so unique addresses cannot grow memory indefinitely.
 */
export class AnonymousVisitRateLimiter {
  private readonly recentVisits = new Map<string, number>();

  constructor(
    private readonly windowMs = 60_000,
    private readonly maxEntries = 20_000,
  ) {}

  shouldLog(ip: string | null, path: string, now = Date.now()): boolean {
    const key = `${ip ?? "unknown"}:${path}`;
    const previousVisit = this.recentVisits.get(key);

    if (previousVisit !== undefined && now - previousVisit < this.windowMs) {
      return false;
    }

    if (this.recentVisits.size >= this.maxEntries) {
      for (const [existingKey, timestamp] of this.recentVisits) {
        if (now - timestamp >= this.windowMs) {
          this.recentVisits.delete(existingKey);
        }
        if (this.recentVisits.size < this.maxEntries) break;
      }

      if (this.recentVisits.size >= this.maxEntries) {
        const oldestKey = this.recentVisits.keys().next().value;
        if (oldestKey !== undefined) this.recentVisits.delete(oldestKey);
      }
    }

    this.recentVisits.set(key, now);
    return true;
  }
}
