import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import {
  LoginLockedError,
  LoginRateLimiter,
  MAX_LOGIN_FAILURES,
  loginRateKey,
} from "./rate-limit";
import { authorizeCredentials, clientIpFromRequest } from "./credentials";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
  },
}));

const findUser = vi.mocked(db.user.findUnique);
const comparePassword = vi.mocked(bcrypt.compare) as unknown as {
  mockResolvedValue(value: boolean): void;
};
const createdAt = new Date("2026-06-13T09:00:00.000Z");

function requestFromIp(ip: string) {
  return new Request("https://example.test/api/auth/callback/credentials", {
    headers: {
      "x-forwarded-for": ip,
    },
  });
}

describe("credentials authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("extracts the first forwarded IP from the request", () => {
    const request = new Request("https://example.test/login", {
      headers: {
        "x-forwarded-for": "203.0.113.20, 198.51.100.8",
        "x-real-ip": "198.51.100.9",
      },
    });

    expect(clientIpFromRequest(request)).toBe("203.0.113.20");
  });

  it("records a failure for a wrong password in the Auth.js callback path", async () => {
    const limiter = new LoginRateLimiter();
    const request = requestFromIp("203.0.113.21");
    findUser.mockResolvedValue({
      id: "user_1",
      username: "TieDan",
      passwordHash: "hash",
      createdAt,
    });
    comparePassword.mockResolvedValue(false);

    await expect(
      authorizeCredentials(
        { username: "  TieDan  ", password: "bad-password" },
        request,
        limiter,
      ),
    ).resolves.toBeNull();

    const key = loginRateKey("203.0.113.21", "TieDan");
    for (let i = 1; i < MAX_LOGIN_FAILURES; i += 1) {
      limiter.recordFailure(key);
    }
    expect(limiter.getLock(key)).toMatchObject({ locked: true });
  });

  it("compares against a dummy hash and records a failure when the user does not exist", async () => {
    const limiter = new LoginRateLimiter();
    const recordFailure = vi.spyOn(limiter, "recordFailure");
    const request = requestFromIp("203.0.113.24");
    findUser.mockResolvedValue(null);
    comparePassword.mockResolvedValue(false);

    await expect(
      authorizeCredentials({ username: "missing", password: "bad-password" }, request, limiter),
    ).resolves.toBeNull();

    expect(comparePassword).toHaveBeenCalledTimes(1);
    expect(comparePassword).toHaveBeenCalledWith(
      "bad-password",
      expect.stringMatching(/^\$2[aby]\$/),
    );
    expect(recordFailure).toHaveBeenCalledWith(loginRateKey("203.0.113.24", "missing"));
  });

  it("throws a locked error before querying the database when the key is locked", async () => {
    const limiter = new LoginRateLimiter();
    const request = requestFromIp("203.0.113.22");
    const key = loginRateKey("203.0.113.22", "tiedan");

    for (let i = 0; i < MAX_LOGIN_FAILURES; i += 1) {
      limiter.recordFailure(key);
    }

    await expect(
      authorizeCredentials({ username: "tiedan", password: "password" }, request, limiter),
    ).rejects.toBeInstanceOf(LoginLockedError);
    expect(findUser).not.toHaveBeenCalled();
  });

  it("clears failures after successful credentials authorization", async () => {
    const limiter = new LoginRateLimiter();
    const request = requestFromIp("203.0.113.23");
    const key = loginRateKey("203.0.113.23", "tiedan");
    limiter.recordFailure(key);
    findUser.mockResolvedValue({
      id: "user_1",
      username: "tiedan",
      passwordHash: "hash",
      createdAt,
    });
    comparePassword.mockResolvedValue(true);

    await expect(
      authorizeCredentials({ username: "tiedan", password: "password" }, request, limiter),
    ).resolves.toEqual({
      id: "user_1",
      name: "tiedan",
    });

    for (let i = 1; i < MAX_LOGIN_FAILURES; i += 1) {
      limiter.recordFailure(key);
      expect(limiter.getLock(key)).toBeNull();
    }
  });
});
