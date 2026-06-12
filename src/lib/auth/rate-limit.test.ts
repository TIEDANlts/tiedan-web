import { describe, expect, it } from "vitest";
import {
  LOGIN_LOCK_MS,
  LoginRateLimiter,
  MAX_LOGIN_FAILURES,
} from "./rate-limit";

describe("LoginRateLimiter", () => {
  it("locks an IP after five failed attempts", () => {
    const limiter = new LoginRateLimiter();
    const ip = "203.0.113.10";
    const now = Date.UTC(2026, 5, 13, 9, 0, 0);

    for (let i = 1; i < MAX_LOGIN_FAILURES; i += 1) {
      limiter.recordFailure(ip, now);
      expect(limiter.getLock(ip, now)).toBeNull();
    }

    limiter.recordFailure(ip, now);

    expect(limiter.getLock(ip, now)).toEqual({
      locked: true,
      retryAfterSeconds: LOGIN_LOCK_MS / 1000,
    });
  });

  it("unlocks an IP after the lock window passes", () => {
    const limiter = new LoginRateLimiter();
    const ip = "203.0.113.11";
    const now = Date.UTC(2026, 5, 13, 9, 0, 0);

    for (let i = 0; i < MAX_LOGIN_FAILURES; i += 1) {
      limiter.recordFailure(ip, now);
    }

    expect(limiter.getLock(ip, now + LOGIN_LOCK_MS + 1)).toBeNull();
  });

  it("clears failures after a successful login", () => {
    const limiter = new LoginRateLimiter();
    const ip = "203.0.113.12";
    const now = Date.UTC(2026, 5, 13, 9, 0, 0);

    limiter.recordFailure(ip, now);
    limiter.recordFailure(ip, now);
    limiter.clear(ip);

    for (let i = 1; i < MAX_LOGIN_FAILURES; i += 1) {
      limiter.recordFailure(ip, now);
      expect(limiter.getLock(ip, now)).toBeNull();
    }
  });
});
