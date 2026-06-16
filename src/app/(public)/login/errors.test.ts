import { CallbackRouteError, CredentialsSignin } from "@auth/core/errors";
import { describe, expect, it } from "vitest";

import { loginErrorMessage, shouldRecordLoginFailure } from "./errors";

describe("loginErrorMessage", () => {
  it("returns the credential message only for invalid credentials", () => {
    expect(loginErrorMessage(new CredentialsSignin())).toBe("用户名或密码不正确。");
  });

  it("does not hide database or server failures as wrong passwords", () => {
    const error = new CallbackRouteError();

    expect(loginErrorMessage(error)).toBe(
      "登录服务暂时不可用，请先确认本地数据库已启动并可连接。",
    );
    expect(shouldRecordLoginFailure(error)).toBe(false);
  });

  it("records rate-limit failures only for invalid credentials", () => {
    expect(shouldRecordLoginFailure(new CredentialsSignin())).toBe(true);
  });
});
