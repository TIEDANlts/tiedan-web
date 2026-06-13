export const MAX_LOGIN_FAILURES = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

type LoginAttempt = {
  count: number;
  lockedUntil: number | null;
};

export type LoginLock = {
  locked: true;
  retryAfterSeconds: number;
};

export class LoginRateLimiter {
  private attempts = new Map<string, LoginAttempt>();

  getLock(ip: string, now = Date.now()): LoginLock | null {
    const attempt = this.attempts.get(ip);

    if (!attempt?.lockedUntil) {
      return null;
    }

    if (attempt.lockedUntil <= now) {
      this.attempts.delete(ip);
      return null;
    }

    return {
      locked: true,
      retryAfterSeconds: Math.ceil((attempt.lockedUntil - now) / 1000),
    };
  }

  recordFailure(ip: string, now = Date.now()) {
    const current = this.attempts.get(ip);
    const nextCount = (current?.count ?? 0) + 1;

    this.attempts.set(ip, {
      count: nextCount,
      lockedUntil: nextCount >= MAX_LOGIN_FAILURES ? now + LOGIN_LOCK_MS : null,
    });
  }

  clear(ip: string) {
    this.attempts.delete(ip);
  }
}

export const loginRateLimiter = new LoginRateLimiter();
