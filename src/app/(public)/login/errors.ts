import { AuthError, CallbackRouteError, CredentialsSignin } from "@auth/core/errors";

export function loginErrorMessage(error: unknown) {
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
  return error instanceof CredentialsSignin;
}
