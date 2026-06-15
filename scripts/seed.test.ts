import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultExpenseCategories } from "../src/modules/expenses/default-categories";
import { createAdminUser, readAdminCredentials, seedDefaultExpenseCategories } from "./seed";

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

describe("defaultExpenseCategories", () => {
  it("includes expense and income defaults with icons and keywords", () => {
    expect(defaultExpenseCategories.find((category) => category.name === "餐饮")).toMatchObject({
      direction: "EXPENSE",
      icon: "🍜",
    });
    expect(defaultExpenseCategories.find((category) => category.name === "工资")).toMatchObject({
      direction: "INCOME",
      icon: "💼",
    });
    expect(defaultExpenseCategories.every((category) => category.keywords.length > 0)).toBe(true);
  });
});

describe("seedDefaultExpenseCategories", () => {
  it("creates only missing default categories", async () => {
    const created: string[] = [];
    const db = {
      expenseCategory: {
        async findMany() {
          return [{ name: "餐饮" }, { name: "工资" }];
        },
        async create({ data }: { data: { name: string } }) {
          created.push(data.name);
          return data;
        },
      },
    };

    await seedDefaultExpenseCategories(db);

    expect(created).not.toContain("餐饮");
    expect(created).not.toContain("工资");
    expect(created).toContain("交通");
    expect(created).toContain("理财");
  });
});
