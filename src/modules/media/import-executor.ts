import type { MediaImportRowData } from "./import-parser";
import type { MediaStatusValue, MediaTypeValue } from "./utils";

export type MediaImportCreateData = {
  type: MediaTypeValue;
  title: string;
  originalTitle: string | null;
  creator: string | null;
  year: number | null;
  coverUrl: string | null;
  doubanId: string | null;
  tmdbId: string | null;
  isbn: string | null;
  status: MediaStatusValue;
  rating: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  releaseDate: Date | null;
  reviewMd: string | null;
  hasSpoiler: boolean;
  tags: string[];
};

export type MediaImportExecutorDeps = {
  hasDoubanId: (doubanId: string) => Promise<boolean>;
  hasWeakKey: (type: MediaTypeValue, title: string, year: number) => Promise<boolean>;
  saveCover: (coverUrl: string) => Promise<string | null>;
  createItem: (data: MediaImportCreateData) => Promise<void>;
};

export type MediaImportReason = {
  rowNumber: number;
  type: "skipped" | "failed" | "warning";
  message: string;
};

export type MediaImportExecutionResult = {
  success: number;
  skipped: number;
  failed: number;
  reasons: MediaImportReason[];
};

function dbDate(dateText: string | null) {
  return dateText ? new Date(`${dateText}T00:00:00.000Z`) : null;
}

function statusDates(row: MediaImportRowData) {
  const markedDate = dbDate(row.markedAt);

  return {
    startedAt: row.status === "DOING" ? markedDate : null,
    finishedAt: row.status === "DONE" ? markedDate : null,
  };
}

async function localizeCover(rowNumber: number, coverUrl: string | null, deps: MediaImportExecutorDeps) {
  if (!coverUrl) {
    return { coverUrl: null, warning: null };
  }

  if (coverUrl.startsWith("/uploads/")) {
    return { coverUrl, warning: null };
  }

  try {
    const savedUrl = await deps.saveCover(coverUrl);
    return {
      coverUrl: savedUrl?.startsWith("/uploads/") ? savedUrl : null,
      warning: null,
    };
  } catch {
    return {
      coverUrl: null,
      warning: {
        rowNumber,
        type: "warning" as const,
        message: "封面转存失败，已留空封面继续导入。",
      },
    };
  }
}

export async function executeMediaImportRows(
  rows: MediaImportRowData[],
  deps: MediaImportExecutorDeps,
): Promise<MediaImportExecutionResult> {
  const result: MediaImportExecutionResult = {
    success: 0,
    skipped: 0,
    failed: 0,
    reasons: [],
  };

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;

    try {
      if (row.doubanId && (await deps.hasDoubanId(row.doubanId))) {
        result.skipped += 1;
        result.reasons.push({ rowNumber, type: "skipped", message: "豆瓣 ID 已存在，已跳过。" });
        continue;
      }

      if (!row.doubanId && row.year && (await deps.hasWeakKey(row.type, row.title, row.year))) {
        result.skipped += 1;
        result.reasons.push({ rowNumber, type: "skipped", message: "同类型、标题与年份的条目已存在，已跳过。" });
        continue;
      }

      const localizedCover = await localizeCover(rowNumber, row.coverUrl, deps);
      if (localizedCover.warning) {
        result.reasons.push(localizedCover.warning);
      }

      await deps.createItem({
        type: row.type,
        title: row.title,
        originalTitle: null,
        creator: null,
        year: row.year,
        coverUrl: localizedCover.coverUrl,
        doubanId: row.doubanId,
        tmdbId: null,
        isbn: null,
        status: row.status,
        rating: row.rating,
        ...statusDates(row),
        releaseDate: null,
        reviewMd: row.reviewMd,
        hasSpoiler: false,
        tags: [],
      });

      result.success += 1;
    } catch (error) {
      result.failed += 1;
      result.reasons.push({
        rowNumber,
        type: "failed",
        message: error instanceof Error ? error.message : "这一行导入失败。",
      });
    }
  }

  return result;
}
