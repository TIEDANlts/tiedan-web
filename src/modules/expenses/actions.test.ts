import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  db: {
    $transaction: vi.fn(),
    expenseCategory: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
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

vi.mock("@/lib/activity", () => ({
  expenseImportTitle: vi.fn(),
  recordActivity: vi.fn(),
}));

vi.mock("@/modules/expenses/category-options", () => ({
  getExpenseCategoriesForCategorize: vi.fn(),
  getExpenseCategoryOptions: vi.fn(),
}));

vi.mock("@/modules/expenses/parsers", () => ({
  detectExpenseImportPlatform: vi.fn(),
  parseExpenseImportFile: vi.fn(),
}));

import { buildCompleteSortUpdates, reorderExpenseCategoriesAction } from "./actions";

describe("buildCompleteSortUpdates", () => {
  it("builds stepped sort updates for a complete ordered id set", () => {
    expect(buildCompleteSortUpdates(["food", "salary"], ["salary", "food"])).toEqual([
      { id: "salary", sort: 10 },
      { id: "food", sort: 20 },
    ]);
  });

  it("rejects incomplete ordered ids", () => {
    expect(buildCompleteSortUpdates(["food", "salary"], ["salary"])).toBeNull();
  });

  it("rejects duplicate ordered ids", () => {
    expect(buildCompleteSortUpdates(["food", "salary"], ["food", "food"])).toBeNull();
  });

  it("rejects unknown ordered ids", () => {
    expect(buildCompleteSortUpdates(["food", "salary"], ["food", "unknown"])).toBeNull();
  });
});

describe("reorderExpenseCategoriesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.db.expenseCategory.findMany.mockResolvedValue([{ id: "food" }, { id: "salary" }]);
  });

  it("rejects incomplete ordered ids without writing partial sort values", async () => {
    await expect(reorderExpenseCategoriesAction(["salary"])).resolves.toMatchObject({
      ok: false,
      message: "分类排序已过期，请刷新后重试。",
    });

    expect(mocks.db.expenseCategory.update).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects duplicate ordered ids without writing partial sort values", async () => {
    await expect(reorderExpenseCategoriesAction(["food", "food"])).resolves.toMatchObject({
      ok: false,
      message: "分类排序已过期，请刷新后重试。",
    });

    expect(mocks.db.expenseCategory.update).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects unknown ordered ids without writing partial sort values", async () => {
    await expect(reorderExpenseCategoriesAction(["food", "unknown"])).resolves.toMatchObject({
      ok: false,
      message: "分类排序已过期，请刷新后重试。",
    });

    expect(mocks.db.expenseCategory.update).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
