import { describe, expect, it } from "vitest";
import { AnonymousVisitRateLimiter } from "./anonymous-analytics";

describe("anonymous visit rate limiter", () => {
  it("throttles repeated visits by IP and path, independent of client session IDs", () => {
    const limiter = new AnonymousVisitRateLimiter(60_000, 100);

    expect(limiter.shouldLog("203.0.113.10", "/bible", 1_000)).toBe(true);
    // Session IDs are intentionally not part of the limiter's input/key.
    expect(limiter.shouldLog("203.0.113.10", "/bible", 2_000)).toBe(false);
    expect(limiter.shouldLog("203.0.113.10", "/bible", 62_000)).toBe(true);
  });

  it("allows a different page or visitor address within the same window", () => {
    const limiter = new AnonymousVisitRateLimiter(60_000, 100);

    expect(limiter.shouldLog("203.0.113.10", "/bible", 1_000)).toBe(true);
    expect(limiter.shouldLog("203.0.113.10", "/hymns", 2_000)).toBe(true);
    expect(limiter.shouldLog("203.0.113.11", "/bible", 2_000)).toBe(true);
  });

  it("keeps its cache bounded when unique visitor addresses arrive", () => {
    const limiter = new AnonymousVisitRateLimiter(60_000, 2);

    expect(limiter.shouldLog("203.0.113.10", "/bible", 1_000)).toBe(true);
    expect(limiter.shouldLog("203.0.113.11", "/bible", 1_001)).toBe(true);
    expect(limiter.shouldLog("203.0.113.12", "/bible", 1_002)).toBe(true);
    // The oldest key was evicted to enforce the configured cap.
    expect(limiter.shouldLog("203.0.113.10", "/bible", 1_003)).toBe(true);
  });
});
