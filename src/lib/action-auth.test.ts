import { beforeEach, describe, expect, it, vi } from "vitest";

import { createManualTransactionAction } from "@/modules/expenses/actions";
import { createGameAction } from "@/modules/games/actions";
import { createMediaItemAction } from "@/modules/media/actions";
import { savePostAction } from "@/modules/posts/actions";
import { createTodoAction } from "@/modules/todos/actions";
import { createTripAction } from "@/modules/trips/actions";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  db: {},
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/lib/storage", () => ({
  remoteImageErrorMessage: vi.fn(() => "remote image error"),
  saveFromUrl: vi.fn(),
}));

vi.mock("@/modules/games/steam", () => ({
  syncSteamLibrary: vi.fn(),
}));

vi.mock("@/modules/media/metadata", () => ({
  searchMediaMetadata: vi.fn(),
}));

vi.mock("@/modules/expenses/category-options", () => ({
  getExpenseCategoriesForCategorize: vi.fn(),
  getExpenseCategoryOptions: vi.fn(),
}));

vi.mock("@/modules/expenses/parsers", () => ({
  detectExpenseImportPlatform: vi.fn(),
  parseExpenseImportFile: vi.fn(),
}));

describe("server action authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(null);
  });

  it("rejects unauthenticated post actions with the module message", async () => {
    await expect(savePostAction({ ok: false, message: null }, new FormData())).rejects.toThrow(/博客/);
  });

  it("rejects unauthenticated game actions with the module message", async () => {
    await expect(createGameAction({ ok: false, message: null }, new FormData())).rejects.toThrow(/游戏/);
  });

  it("rejects unauthenticated media actions with the module message", async () => {
    await expect(createMediaItemAction({ ok: false, message: null }, new FormData())).rejects.toThrow(/书影/);
  });

  it("rejects unauthenticated trip actions with the module message", async () => {
    await expect(createTripAction({ ok: false, message: null }, new FormData())).rejects.toThrow(/旅行/);
  });

  it("rejects unauthenticated expense actions with the module message", async () => {
    await expect(createManualTransactionAction({ ok: false, message: null }, new FormData())).rejects.toThrow(/消费/);
  });

  it("rejects unauthenticated todo actions with the module message", async () => {
    await expect(createTodoAction({ ok: false, message: null }, new FormData())).rejects.toThrow(/待办/);
  });
});
