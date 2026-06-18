import { db } from "./db";

type DiagnosedModule = "posts" | "media" | "trips" | "expenses";

type ActivityDiagnosticRow = {
  id: string;
  module: string;
  action: string;
  refId: string;
  title: string;
  happenedAt: Date;
};

export type OrphanActivity = ActivityDiagnosticRow & {
  module: DiagnosedModule;
  reason: string;
};

const DIAGNOSED_MODULES = ["posts", "media", "trips", "expenses"] as const;

function idsFor(rows: ActivityDiagnosticRow[], module: DiagnosedModule, action?: string) {
  return Array.from(
    new Set(
      rows
        .filter((row) => row.module === module && (!action || row.action === action))
        .map((row) => row.refId),
    ),
  );
}

function missingRows(
  rows: ActivityDiagnosticRow[],
  module: DiagnosedModule,
  existingIds: Set<string>,
  reason: string,
  action?: string,
) {
  return rows
    .filter((row) => row.module === module && (!action || row.action === action) && !existingIds.has(row.refId))
    .map((row) => ({
      ...row,
      module,
      reason,
    }));
}

async function existingPostIds(ids: string[]) {
  if (ids.length === 0) {
    return new Set<string>();
  }

  const rows = await db.post.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  return new Set(rows.map((row) => row.id));
}

async function existingMediaIds(ids: string[]) {
  if (ids.length === 0) {
    return new Set<string>();
  }

  const rows = await db.mediaItem.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  return new Set(rows.map((row) => row.id));
}

async function existingTripIds(ids: string[]) {
  if (ids.length === 0) {
    return new Set<string>();
  }

  const rows = await db.trip.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  return new Set(rows.map((row) => row.id));
}

async function existingImportBatchIds(ids: string[]) {
  if (ids.length === 0) {
    return new Set<string>();
  }

  const rows = await db.importBatch.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  return new Set(rows.map((row) => row.id));
}

export async function findOrphanActivities(): Promise<OrphanActivity[]> {
  const rows = await db.activity.findMany({
    where: { module: { in: [...DIAGNOSED_MODULES] } },
    orderBy: { happenedAt: "desc" },
    select: {
      id: true,
      module: true,
      action: true,
      refId: true,
      title: true,
      happenedAt: true,
    },
  });

  const [postIds, mediaIds, tripIds, importBatchIds] = await Promise.all([
    existingPostIds(idsFor(rows, "posts", "published")),
    existingMediaIds(idsFor(rows, "media", "done")),
    existingTripIds(idsFor(rows, "trips", "done")),
    existingImportBatchIds(idsFor(rows, "expenses", "imported")),
  ]);

  return [
    ...missingRows(rows, "posts", postIds, "文章已不存在。", "published"),
    ...missingRows(rows, "media", mediaIds, "书影条目已不存在。", "done"),
    ...missingRows(rows, "trips", tripIds, "旅行已不存在。", "done"),
    ...missingRows(rows, "expenses", importBatchIds, "账单导入批次已不存在。", "imported"),
  ];
}
