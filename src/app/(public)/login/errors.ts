import { AuthError, CallbackRouteError, CredentialsSignin } from "@auth/core/errors";
import { LoginLockedError } from "@/lib/auth/rate-limit";

function loginLockedErrorFrom(error: unknown) {
  if (error instanceof LoginLockedError) {
    return error;
  }

  if (error instanceof AuthError && error.cause?.err instanceof LoginLockedError) {
    return error.cause.err;
  }

  return null;
}

export function loginErrorMessage(error: unknown) {
  const lockedError = loginLockedErrorFrom(error);

  if (lockedError) {
    return `尝试次数太多，请 ${Math.ceil(lockedError.retryAfterSeconds / 60)} 分钟后再试。`;
  }

  if (error instanceof CredentialsSignin) {
    return "用户名或密码不正确。";
  }

  if (error instanceof CallbackRouteError) {
    return "登录服务暂时不可用，请先确认本地数据库已启动并可连接。";
  }

  if (error instanceof AuthError) {
    return "登录服务暂时不可用，请稍后再试。";
  }

  return "登录服务暂时不可用，请稍后再试。";
}

export function shouldRecordLoginFailure(error: unknown) {
  return error instanceof CredentialsSignin && !loginLockedErrorFrom(error);
}
