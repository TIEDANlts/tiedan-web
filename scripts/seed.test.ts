import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminUser, readAdminCredentials } from "./seed";

describe("readAdminCredentials", () => {
  it("throws when admin credentials are missing", () => {
    expect(() => readAdminCredentials({})).toThrow(
      "ADMIN_USERNAME 和 ADMIN_PASSWORD 必须同时配置",
    );
  });

  it("returns configured admin credentials", () => {
    expect(
      readAdminCredentials({
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "secret-password",
      }),
    ).toEqual({ username: "admin", password: "secret-password" });
  });
});

describe("createAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts the unique administrator with a bcrypt hash", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "user_1", username: "admin" });
    const hashPassword = vi.fn().mockResolvedValue("hashed-password");

    await createAdminUser({
      username: "admin",
      password: "secret-password",
      db: {
        user: {
          upsert,
        },
      },
      hashPassword,
    });

    expect(hashPassword).toHaveBeenCalledWith("secret-password", 12);
    expect(upsert).toHaveBeenCalledWith({
      where: { username: "admin" },
      create: { username: "admin", passwordHash: "hashed-password" },
      update: { passwordHash: "hashed-password" },
    });
  });
});
