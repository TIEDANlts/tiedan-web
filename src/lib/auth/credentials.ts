import bcrypt from "bcrypt";

import { db } from "@/lib/db";
import {
  LoginLockedError,
  loginRateKey,
  loginRateLimiter,
  type LoginRateLimiter,
} from "./rate-limit";

type CredentialsInput = Partial<Record<"username" | "password", unknown>> | undefined;

export function clientIpFromRequest(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

export async function authorizeCredentials(
  credentials: CredentialsInput,
  request: Request,
  limiter: LoginRateLimiter = loginRateLimiter,
) {
  const username = typeof credentials?.username === "string" ? credentials.username.trim() : "";
  const password = typeof credentials?.password === "string" ? credentials.password : "";
  const key = loginRateKey(clientIpFromRequest(request), username);
  const lock = limiter.getLock(key);

  if (lock) {
    throw new LoginLockedError(lock.retryAfterSeconds);
  }

  if (!username || !password) {
    limiter.recordFailure(key);
    return null;
  }

  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    limiter.recordFailure(key);
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    limiter.recordFailure(key);
    return null;
  }

  limiter.clear(key);

  return {
    id: user.id,
    name: user.username,
  };
}
