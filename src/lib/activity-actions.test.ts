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
      createMany: vi.fn(),
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
        upsert: vi.fn(),
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
      tripDay: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
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

function tripForm(status: string, startDate = "2026-06-01", endDate = "2026-06-03") {
  const formData = new FormData();
  formData.set("id", "trip-1");
  formData.set("title", "杭州三日");
  formData.set("startDate", startDate);
  formData.set("endDate", endDate);
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

function parsedDuplicateExpenseRows() {
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
      {
        txnNo: "txn-1",
        txnTime: "2026-06-01 12:01:00",
        amount: "18.00",
        direction: "EXPENSE",
        merchant: "咖啡店",
        item: "三明治",
        payMethod: "支付宝",
        sourceCategory: "餐饮",
        raw: { txnNo: "txn-1" },
      },
    ],
    filteredRows: [],
    errors: [],
  };
}

function expectActivityRecorded(module: string, action: string, refId: string, title: string) {
  expect(mocks.db.activity.upsert).toHaveBeenCalledWith({
    where: {
      module_action_refId: {
        module,
        action,
        refId,
      },
    },
    create: {
      module,
      action,
      refId,
      title,
    },
    update: {
      title,
    },
  });
}

describe("activity recording in server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session();
    mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.db));
  });

  it("records a game activity only when the status enters FINISHED", async () => {
    mocks.db.game.findUnique.mockResolvedValueOnce({ id: "game-1", status: "PLAYING" });
    mocks.db.game.update.mockResolvedValueOnce({ id: "game-1", name: "星露谷物语", status: "FINISHED" });

    await updateGameAction({ ok: false, message: null }, gameForm("FINISHED"));

    expectActivityRecorded("games", "finished", "game-1", "通关了《星露谷物语》");

    vi.clearAllMocks();
    session();
    mocks.db.game.findUnique.mockResolvedValueOnce({ id: "game-1", status: "FINISHED" });
    mocks.db.game.update.mockResolvedValueOnce({ id: "game-1", name: "星露谷物语", status: "FINISHED" });

    await updateGameAction({ ok: false, message: null }, gameForm("FINISHED"));

    expect(mocks.db.activity.upsert).not.toHaveBeenCalled();
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

    expectActivityRecorded("media", "done", "media-1", "读完《活着》");

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

    expect(mocks.db.activity.upsert).not.toHaveBeenCalled();
  });

  it("records post publish activity through the idempotent activity key", async () => {
    mocks.db.post.create.mockResolvedValueOnce({
      id: "post-1",
      title: "第一篇文章",
      slug: "first-post",
      status: "PUBLISHED",
    });

    await savePostAction({ ok: false, message: null }, postForm());

    expectActivityRecorded("posts", "published", "post-1", "发布了文章《第一篇文章》");
    expect(mocks.db.activity.findFirst).not.toHaveBeenCalled();

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

    await savePostAction({ ok: false, message: null }, postForm("publish", "post-1"));

    expectActivityRecorded("posts", "published", "post-1", "发布了文章《第一篇文章》");
    expect(mocks.db.activity.findFirst).not.toHaveBeenCalled();
  });

  it("records a trip activity only when the status enters DONE", async () => {
    mocks.db.trip.findUnique.mockResolvedValueOnce({ status: "PLANNED", days: [] });
    mocks.db.trip.update.mockResolvedValueOnce({});

    await updateTripOverviewAction({ ok: false, message: null }, tripForm("DONE"));

    expectActivityRecorded("trips", "done", "trip-1", "完成了旅行：杭州三日");

    vi.clearAllMocks();
    session();
    mocks.db.trip.findUnique.mockResolvedValueOnce({ status: "DONE", days: [] });
    mocks.db.trip.update.mockResolvedValueOnce({});

    await updateTripOverviewAction({ ok: false, message: null }, tripForm("DONE"));

    expect(mocks.db.activity.upsert).not.toHaveBeenCalled();
  });

  it("syncs trip day rows when the overview date range changes", async () => {
    mocks.db.trip.findUnique.mockResolvedValueOnce({
      status: "PLANNED",
      days: [
        { id: "day-1", date: new Date("2026-06-01T00:00:00.000Z") },
        { id: "day-2", date: new Date("2026-06-02T00:00:00.000Z") },
        { id: "day-3", date: new Date("2026-06-03T00:00:00.000Z") },
      ],
    });

    await updateTripOverviewAction({ ok: false, message: null }, tripForm("PLANNED", "2026-06-02", "2026-06-04"));

    expect(mocks.db.tripDay.deleteMany).toHaveBeenCalledWith({
      where: { tripId: "trip-1", id: { in: ["day-1"] } },
    });
    expect(mocks.db.tripDay.createMany).toHaveBeenCalledWith({
      data: [{ tripId: "trip-1", date: new Date("2026-06-04T00:00:00.000Z") }],
      skipDuplicates: true,
    });
  });

  it("records an expense import activity only when new rows are inserted", async () => {
    mocks.parseExpenseImportFile.mockReturnValue(parsedExpenseRows());
    mocks.getExpenseCategoriesForCategorize.mockResolvedValue([]);
    mocks.db.transaction.findMany.mockResolvedValueOnce([]);
    mocks.tx.importBatch.create.mockResolvedValueOnce({ id: "batch-1" });
    mocks.tx.transaction.createMany.mockResolvedValueOnce({ count: 1 });
    mocks.tx.importBatch.update.mockResolvedValueOnce({});
    mocks.db.$transaction.mockImplementationOnce(async (callback) => callback(mocks.tx));

    await executeExpenseImportAction({
      payload: Buffer.from("csv").toString("base64"),
      fileName: "alipay.csv",
      platform: "alipay",
    });

    expectActivityRecorded("expenses", "imported", "batch-1", "导入了 1 笔账单");

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

    expect(mocks.db.activity.upsert).not.toHaveBeenCalled();
  });

  it("counts duplicate transaction numbers within the same import as skipped rows", async () => {
    mocks.parseExpenseImportFile.mockReturnValue(parsedDuplicateExpenseRows());
    mocks.getExpenseCategoriesForCategorize.mockResolvedValue([]);
    mocks.db.transaction.findMany.mockResolvedValueOnce([]);
    mocks.tx.importBatch.create.mockResolvedValueOnce({ id: "batch-3" });
    mocks.tx.transaction.createMany.mockResolvedValueOnce({ count: 1 });
    mocks.tx.importBatch.update.mockResolvedValueOnce({});
    mocks.db.$transaction.mockImplementationOnce(async (callback) => callback(mocks.tx));

    const result = await executeExpenseImportAction({
      payload: Buffer.from("csv").toString("base64"),
      fileName: "alipay.csv",
      platform: "alipay",
    });

    expect(result).toMatchObject({ ok: true, batchId: "batch-3", inserted: 1, skipped: 1, total: 2 });
    expect(mocks.tx.transaction.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ txnNo: "txn-1", amount: "12.30" })],
      skipDuplicates: true,
    });
    expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
    expect(mocks.tx.importBatch.update).toHaveBeenCalledWith({
      where: { id: "batch-3" },
      data: { inserted: 1, skipped: 1 },
    });
  });

  it("counts every existing duplicate row, not just unique transaction numbers", async () => {
    mocks.parseExpenseImportFile.mockReturnValue({
      ...parsedDuplicateExpenseRows(),
      rows: [
        ...parsedDuplicateExpenseRows().rows,
        {
          ...parsedDuplicateExpenseRows().rows[0],
          txnTime: "2026-06-01 12:02:00",
          amount: "22.00",
        },
      ],
    });
    mocks.getExpenseCategoriesForCategorize.mockResolvedValue([]);
    mocks.db.transaction.findMany.mockResolvedValueOnce([{ txnNo: "txn-1" }]);
    mocks.tx.importBatch.create.mockResolvedValueOnce({ id: "batch-4" });
    mocks.tx.importBatch.update.mockResolvedValueOnce({});
    mocks.db.$transaction.mockImplementationOnce(async (callback) => callback(mocks.tx));

    const result = await executeExpenseImportAction({
      payload: Buffer.from("csv").toString("base64"),
      fileName: "alipay.csv",
      platform: "alipay",
    });

    expect(result).toMatchObject({ ok: true, batchId: "batch-4", inserted: 0, skipped: 3, total: 3 });
    expect(mocks.tx.transaction.createMany).not.toHaveBeenCalled();
    expect(mocks.tx.importBatch.update).toHaveBeenCalledWith({
      where: { id: "batch-4" },
      data: { inserted: 0, skipped: 3 },
    });
  });
});
