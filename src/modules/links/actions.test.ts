import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  db: {
    $transaction: vi.fn(),
    link: {
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

vi.mock("@/lib/storage", () => ({
  saveFromUrl: vi.fn(),
}));

vi.mock("@/modules/links/favicon", () => ({
  fetchAndCacheFavicon: vi.fn(),
}));

import { reorderLinksAction } from "./actions";

describe("reorderLinksAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.db.link.findMany.mockResolvedValue([
      { id: "a", group: "工具", sort: 0 },
      { id: "b", group: "工具", sort: 1 },
    ]);
  });

  async function expectRejectedReorder(orderedIds: string[]) {
    await expect(reorderLinksAction("工具", orderedIds)).resolves.toMatchObject({
      ok: false,
      message: "排序列表已过期，请刷新后重试。",
    });

    expect(mocks.db.link.update).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  }

  it("rejects incomplete ordered ids without writing partial sort values", async () => {
    await expectRejectedReorder(["b"]);
  });

  it("rejects duplicate ordered ids without writing partial sort values", async () => {
    await expectRejectedReorder(["a", "a"]);
  });

  it("rejects unknown ordered ids without writing partial sort values", async () => {
    await expectRejectedReorder(["a", "unknown"]);
  });

  it("rejects ids from another group without writing partial sort values", async () => {
    mocks.db.link.findMany.mockResolvedValueOnce([
      { id: "a", group: "工具", sort: 0 },
      { id: "b", group: "工具", sort: 1 },
      { id: "c", group: "阅读", sort: 0 },
    ]);

    await expectRejectedReorder(["a", "b", "c"]);
  });
});
