import { AuthError, CallbackRouteError, CredentialsSignin } from "@auth/core/errors";
import { describe, expect, it } from "vitest";

import { LoginLockedError } from "@/lib/auth/rate-limit";
import { loginErrorMessage } from "./errors";

describe("loginErrorMessage", () => {
  it("returns the credential message only for invalid credentials", () => {
    expect(loginErrorMessage(new CredentialsSignin())).toBe("用户名或密码不正确。");
  });

  it("does not hide database or server failures as wrong passwords", () => {
    const error = new CallbackRouteError();

    expect(loginErrorMessage(error)).toBe(
      "登录服务暂时不可用，请先确认本地数据库已启动并可连接。",
    );
  });

  it("returns a lock message without recording another failure", () => {
    const error = new LoginLockedError(121);

    expect(loginErrorMessage(error)).toBe("尝试次数太多，请 3 分钟后再试。");
  });

  it("recognizes locked credentials errors wrapped by Auth.js callback handling", () => {
    const error = new CallbackRouteError();
    error.cause = { err: new LoginLockedError(61) } satisfies AuthError["cause"];

    expect(loginErrorMessage(error)).toBe("尝试次数太多，请 2 分钟后再试。");
  });
});
