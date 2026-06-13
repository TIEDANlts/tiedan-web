"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { loginRateLimiter } from "@/lib/auth/rate-limit";
import { safeFromPath } from "@/lib/auth/routes";

export type LoginState = {
  error: string | null;
};

function getClientIp(headersList: Headers) {
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const lock = loginRateLimiter.getLock(ip);

  if (lock) {
    return {
      error: `尝试次数太多，请 ${Math.ceil(lock.retryAfterSeconds / 60)} 分钟后再试。`,
    };
  }

  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const from = safeFromPath(String(formData.get("from") ?? "/"));

  try {
    await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      loginRateLimiter.recordFailure(ip);
      return { error: "用户名或密码不正确。" };
    }

    throw error;
  }

  loginRateLimiter.clear(ip);
  redirect(from);
}
