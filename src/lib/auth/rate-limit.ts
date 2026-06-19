import { CredentialsSignin } from "@auth/core/errors";

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

export class LoginLockedError extends CredentialsSignin {
  code = "login_locked";

  constructor(public readonly retryAfterSeconds: number) {
    super();
  }
}

export function loginRateKey(ip: string, username: string) {
  const normalizedUsername = username.trim().toLowerCase() || "unknown";
  return `${ip}:${normalizedUsername}`;
}

export class LoginRateLimiter {
  private attempts = new Map<string, LoginAttempt>();

  getLock(key: string, now = Date.now()): LoginLock | null {
    const attempt = this.attempts.get(key);

    if (!attempt?.lockedUntil) {
      return null;
    }

    if (attempt.lockedUntil <= now) {
      this.attempts.delete(key);
      return null;
    }

    return {
      locked: true,
      retryAfterSeconds: Math.ceil((attempt.lockedUntil - now) / 1000),
    };
  }

  recordFailure(key: string, now = Date.now()) {
    const current = this.attempts.get(key);
    const nextCount = (current?.count ?? 0) + 1;

    this.attempts.set(key, {
      count: nextCount,
      lockedUntil: nextCount >= MAX_LOGIN_FAILURES ? now + LOGIN_LOCK_MS : null,
    });
  }

  clear(key: string) {
    this.attempts.delete(key);
  }
}

export const loginRateLimiter = new LoginRateLimiter();
