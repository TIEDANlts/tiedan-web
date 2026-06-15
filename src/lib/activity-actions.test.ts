import { beforeEach, describe, expect, it, vi } from "vitest";

import { executeExpenseImportAction } from "../modules/expenses/actions";
import { updateGameAction } from "../modules/games/actions";
import { advanceMediaStatusAction } from "../modules/media/actions";
import { savePostAction } from "../modules/posts/actions";
import { updateTripOverviewAction } from "../modules/trips/actions";

const mocks = vi.hoisted(() => {
  const tx = {
    importBatch: {
      create: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
  };

  return {
    auth: vi.fn(),
    revalidatePath: vi.fn(),
    parseExpenseImportFile: vi.fn(),
    getExpenseCategoriesForCategorize: vi.fn(),
    tx,
    db: {
      activity: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      game: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      mediaItem: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      post: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      trip: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      transaction: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

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

vi.mock("@/modules/expenses/parsers", () => ({
  detectExpenseImportPlatform: vi.fn(),
  parseExpenseImportFile: mocks.parseExpenseImportFile,
}));

vi.mock("@/modules/expenses/category-options", () => ({
  getExpenseCategoriesForCategorize: mocks.getExpenseCategoriesForCategorize,
  getExpenseCategoryOptions: vi.fn(),
}));

function session() {
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
}

function gameForm(status: string) {
  const formData = new FormData();
  formData.set("id", "game-1");
  formData.set("name", "星露谷物语");
  formData.set("platform", "Steam");
  formData.set("status", status);
  formData.set("rating", "9");
  return formData;
}

function postForm(intent = "publish", id = "") {
  const formData = new FormData();
  formData.set("id", id);
  formData.set("intent", intent);
  formData.set("title", "第一篇文章");
  formData.set("slug", "first-post");
  formData.set("category", "随笔");
  formData.set("contentMd", "正文");
  return formData;
}

function tripForm(status: string) {
  const formData = new FormData();
  formData.set("id", "trip-1");
  formData.set("title", "杭州三日");
  formData.set("startDate", "2026-06-01");
  formData.set("endDate", "2026-06-03");
  formData.set("destinations", "杭州");
  formData.set("status", status);
  return formData;
}

function parsedExpenseRows() {
  return {
    platform: "alipay",
    rows: [
      {
        txnNo: "txn-1",
        txnTime: "2026-06-01 12:00:00",
        amount: "12.30",
        direction: "EXPENSE",
        merchant: "咖啡店",
        item: "拿铁",
        payMethod: "支付宝",
        sourceCategory: "餐饮",
        raw: { txnNo: "txn-1" },
      },
    ],
    filteredRows: [],
    errors: [],
  };
}

describe("activity recording in server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session();
  });

  it("records a game activity only when the status enters FINISHED", async () => {
    mocks.db.game.findUnique.mockResolvedValueOnce({ id: "game-1", status: "PLAYING" });
    mocks.db.game.update.mockResolvedValueOnce({ id: "game-1", name: "星露谷物语", status: "FINISHED" });

    await updateGameAction({ ok: false, message: null }, gameForm("FINISHED"));

    expect(mocks.db.activity.create).toHaveBeenCalledWith({
      data: {
        module: "games",
        action: "finished",
        refId: "game-1",
        title: "通关了《星露谷物语》",
      },
    });

    vi.clearAllMocks();
    session();
    mocks.db.game.findUnique.mockResolvedValueOnce({ id: "game-1", status: "FINISHED" });
    mocks.db.game.update.mockResolvedValueOnce({ id: "game-1", name: "星露谷物语", status: "FINISHED" });

    await updateGameAction({ ok: false, message: null }, gameForm("FINISHED"));

    expect(mocks.db.activity.create).not.toHaveBeenCalled();
  });

  it("records a media activity only when the status enters DONE", async () => {
    mocks.db.mediaItem.findUnique.mockResolvedValueOnce({
      type: "BOOK",
      title: "活着",
      status: "DOING",
      rating: null,
      startedAt: new Date("2026-06-01T00:00:00.000Z"),
      finishedAt: null,
    });
    mocks.db.mediaItem.update.mockResolvedValueOnce({});

    await advanceMediaStatusAction("media-1");

    expect(mocks.db.activity.create).toHaveBeenCalledWith({
      data: {
        module: "media",
        action: "done",
        refId: "media-1",
        title: "读完《活着》",
      },
    });

    vi.clearAllMocks();
    session();
    mocks.db.mediaItem.findUnique.mockResolvedValueOnce({
      type: "BOOK",
      title: "活着",
      status: "DONE",
      rating: null,
      startedAt: new Date("2026-06-01T00:00:00.000Z"),
      finishedAt: new Date("2026-06-02T00:00:00.000Z"),
    });

    await advanceMediaStatusAction("media-1");

    expect(mocks.db.activity.create).not.toHaveBeenCalled();
  });

  it("records a post publish activity once per post id", async () => {
    mocks.db.post.create.mockResolvedValueOnce({
      id: "post-1",
      title: "第一篇文章",
      slug: "first-post",
      status: "PUBLISHED",
    });
    mocks.db.activity.findFirst.mockResolvedValueOnce(null);

    await savePostAction({ ok: false, message: null }, postForm());

    expect(mocks.db.activity.create).toHaveBeenCalledWith({
      data: {
        module: "posts",
        action: "published",
        refId: "post-1",
        title: "发布了文章《第一篇文章》",
      },
    });

    vi.clearAllMocks();
    session();
    mocks.db.post.findUnique.mockResolvedValueOnce({
      status: "DRAFT",
      slug: "old-post",
      publishedAt: null,
    });
    mocks.db.post.update.mockResolvedValueOnce({
      id: "post-1",
      title: "第一篇文章",
      slug: "renamed-post",
      status: "PUBLISHED",
    });
    mocks.db.activity.findFirst.mockResolvedValueOnce({ id: "activity-1" });

    await savePostAction({ ok: false, message: null }, postForm("publish", "post-1"));

    expect(mocks.db.activity.create).not.toHaveBeenCalled();
    expect(mocks.db.activity.findFirst).toHaveBeenCalledWith({
      where: { module: "posts", action: "published", refId: "post-1" },
      select: { id: true },
    });
  });

  it("records a trip activity only when the status enters DONE", async () => {
    mocks.db.trip.findUnique.mockResolvedValueOnce({ status: "PLANNED" });
    mocks.db.trip.update.mockResolvedValueOnce({});

    await updateTripOverviewAction({ ok: false, message: null }, tripForm("DONE"));

    expect(mocks.db.activity.create).toHaveBeenCalledWith({
      data: {
        module: "trips",
        action: "done",
        refId: "trip-1",
        title: "完成了旅行：杭州三日",
      },
    });

    vi.clearAllMocks();
    session();
    mocks.db.trip.findUnique.mockResolvedValueOnce({ status: "DONE" });
    mocks.db.trip.update.mockResolvedValueOnce({});

    await updateTripOverviewAction({ ok: false, message: null }, tripForm("DONE"));

    expect(mocks.db.activity.create).not.toHaveBeenCalled();
  });

  it("records an expense import activity only when new rows are inserted", async () => {
    mocks.parseExpenseImportFile.mockReturnValue(parsedExpenseRows());
    mocks.getExpenseCategoriesForCategorize.mockResolvedValue([]);
    mocks.db.transaction.findMany.mockResolvedValueOnce([]);
    mocks.tx.importBatch.create.mockResolvedValueOnce({ id: "batch-1" });
    mocks.tx.transaction.create.mockResolvedValueOnce({});
    mocks.tx.importBatch.update.mockResolvedValueOnce({});
    mocks.db.$transaction.mockImplementationOnce(async (callback) => callback(mocks.tx));

    await executeExpenseImportAction({
      payload: Buffer.from("csv").toString("base64"),
      fileName: "alipay.csv",
      platform: "alipay",
    });

    expect(mocks.db.activity.create).toHaveBeenCalledWith({
      data: {
        module: "expenses",
        action: "imported",
        refId: "batch-1",
        title: "导入了 1 笔账单",
      },
    });

    vi.clearAllMocks();
    session();
    mocks.parseExpenseImportFile.mockReturnValue(parsedExpenseRows());
    mocks.getExpenseCategoriesForCategorize.mockResolvedValue([]);
    mocks.db.transaction.findMany.mockResolvedValueOnce([{ txnNo: "txn-1" }]);
    mocks.tx.importBatch.create.mockResolvedValueOnce({ id: "batch-2" });
    mocks.tx.importBatch.update.mockResolvedValueOnce({});
    mocks.db.$transaction.mockImplementationOnce(async (callback) => callback(mocks.tx));

    await executeExpenseImportAction({
      payload: Buffer.from("csv").toString("base64"),
      fileName: "alipay.csv",
      platform: "alipay",
    });

    expect(mocks.db.activity.create).not.toHaveBeenCalled();
  });
});
