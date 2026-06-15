import "dotenv/config";
import bcrypt from "bcrypt";
import { fileURLToPath } from "node:url";

import { defaultExpenseCategories } from "../src/modules/expenses/default-categories";

type Env = {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
};

type UserStore = {
  user: {
    upsert(input: {
      where: { username: string };
      create: { username: string; passwordHash: string };
      update: { passwordHash: string };
    }): Promise<{ username: string }>;
  };
};

type ExpenseCategoryStore = {
  expenseCategory: {
    findMany(input: {
      where: { name: { in: string[] } };
      select: { name: true };
    }): Promise<Array<{ name: string }>>;
    create(input: {
      data: {
        name: string;
        direction: "EXPENSE" | "INCOME";
        icon: string;
        keywords: string[];
        sort: number;
      };
    }): Promise<unknown>;
  };
};

type CreateAdminUserInput = {
  username: string;
  password: string;
  db: UserStore;
  hashPassword?: (password: string, saltRounds: number) => Promise<string>;
};

export function readAdminCredentials(env: Env) {
  const username = env.ADMIN_USERNAME?.trim();
  const password = env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("ADMIN_USERNAME 和 ADMIN_PASSWORD 必须同时配置");
  }

  return { username, password };
}

export async function createAdminUser({
  username,
  password,
  db: prisma,
  hashPassword = bcrypt.hash,
}: CreateAdminUserInput) {
  const passwordHash = await hashPassword(password, 12);

  return prisma.user.upsert({
    where: { username },
    create: { username, passwordHash },
    update: { passwordHash },
  });
}

export async function seedDefaultExpenseCategories(db: ExpenseCategoryStore) {
  const existingCategories = await db.expenseCategory.findMany({
    where: { name: { in: defaultExpenseCategories.map((category) => category.name) } },
    select: { name: true },
  });
  const existingNames = new Set(existingCategories.map((category) => category.name));

  for (const category of defaultExpenseCategories) {
    if (existingNames.has(category.name)) {
      continue;
    }

    await db.expenseCategory.create({
      data: {
        ...category,
        keywords: [...category.keywords],
      },
    });
  }
}

async function main() {
  const { db } = await import("../src/lib/db");
  const credentials = readAdminCredentials({
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  });
  const user = await createAdminUser({ ...credentials, db });
  await seedDefaultExpenseCategories(db);

  console.log(`管理员账号已就绪：${user.username}`);
  console.log("默认消费分类已就绪");

  await db.$disconnect();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
