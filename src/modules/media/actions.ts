"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { mediaDoneTitle, recordActivity, shouldRecordStatusTransition } from "@/lib/activity";
import { db } from "@/lib/db";
import { formatShanghaiDate } from "@/lib/dayjs";
import { remoteImageErrorMessage, saveFromUrl } from "@/lib/storage";
import { executeMediaImportRows } from "@/modules/media/import-executor";
import { validateMediaImportFile } from "@/modules/media/import-limits";
import {
  guessMediaImportMapping,
  MediaImportLimitError,
  normalizeMediaImportRow,
  parseMediaImportFile,
  type MediaImportDefaults,
  type MediaImportMapping,
  type MediaImportRowData,
  type ParsedMediaImportFile,
} from "@/modules/media/import-parser";
import {
  searchMediaMetadata,
  type MediaMetadataItem,
  type MediaMetadataResult,
} from "@/modules/media/metadata";
import type { MediaActionState } from "@/modules/media/action-state";
import {
  applyMediaStatusDates,
  mediaStatusLabel,
  nextMediaStatus,
  readMediaFormData,
  type MediaStatusValue,
  type MediaTypeValue,
} from "@/modules/media/utils";

async function requireMediaSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理书影。");
  }
}

async function localizeCoverUrl(coverUrl: string | null) {
  if (!coverUrl || coverUrl.startsWith("/uploads/")) {
    return coverUrl;
  }

  const saved = await saveFromUrl(coverUrl, "media");
  return saved.url;
}

function todayAsDbDate() {
  return new Date(`${formatShanghaiDate(new Date())}T00:00:00.000Z`);
}

function withStatusDates(data: {
  previousStatus?: MediaStatusValue;
  status: MediaStatusValue;
  startedAt: Date | null;
  finishedAt: Date | null;
}) {
  return applyMediaStatusDates({
    ...data,
    today: todayAsDbDate(),
  });
}

function doneWithoutRatingWarning(type: MediaTypeValue, status: MediaStatusValue, rating: number | null) {
  if (status !== "DONE" || rating !== null) {
    return undefined;
  }

  return `已标记为${mediaStatusLabel(type, status)}。可以稍后补个评分，方便以后回顾。`;
}

function revalidateMedia(id?: string) {
  revalidatePath("/media");
  revalidatePath("/");
  if (id) {
    revalidatePath(`/media/${id}`);
  }
}

export async function createMediaItemAction(
  _previousState: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  await requireMediaSession();

  const input = readMediaFormData(formData);
  if (!input.ok) {
    return { ok: false, message: "请检查书影信息。", errors: input.errors };
  }

  let coverUrl: string | null;
  try {
    coverUrl = await localizeCoverUrl(input.data.coverUrl);
  } catch (error) {
    return {
      ok: false,
      message: "封面保存失败。",
      errors: { coverUrl: remoteImageErrorMessage(error) },
    };
  }

  const statusDates = withStatusDates(input.data);
  const item = await db.mediaItem.create({
    data: {
      ...input.data,
      ...statusDates,
      coverUrl,
    },
  });

  revalidateMedia(item.id);

  return {
    ok: true,
    itemId: item.id,
    message: "书影条目已加入收藏册。",
    warning: doneWithoutRatingWarning(input.data.type, input.data.status, input.data.rating),
  };
}

export async function updateMediaItemAction(
  _previousState: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  await requireMediaSession();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { ok: false, message: "缺少要编辑的条目。", errors: { form: "书影条目不存在。" } };
  }

  const input = readMediaFormData(formData);
  if (!input.ok) {
    return { ok: false, message: "请检查书影信息。", errors: input.errors };
  }

  const existing = await db.mediaItem.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return { ok: false, message: "这个条目已经不存在。", errors: { form: "书影条目不存在。" } };
  }

  let coverUrl: string | null;
  try {
    coverUrl = await localizeCoverUrl(input.data.coverUrl);
  } catch (error) {
    return {
      ok: false,
      message: "封面保存失败。",
      errors: { coverUrl: remoteImageErrorMessage(error) },
    };
  }

  const statusDates = withStatusDates({
    ...input.data,
    previousStatus: existing.status as MediaStatusValue,
  });
  const item = await db.mediaItem.update({
    where: { id },
    data: {
      ...input.data,
      ...statusDates,
      coverUrl,
    },
  });

  if (shouldRecordStatusTransition(existing.status, item.status, "DONE")) {
    await recordActivity("media", "done", item.id, mediaDoneTitle(item.type, item.title));
  }

  revalidateMedia(item.id);

  return {
    ok: true,
    itemId: item.id,
    message: "书影条目已保存。",
    warning: doneWithoutRatingWarning(input.data.type, input.data.status, input.data.rating),
  };
}

export async function advanceMediaStatusAction(id: string) {
  await requireMediaSession();

  const item = await db.mediaItem.findUnique({
    where: { id },
    select: {
      type: true,
      title: true,
      status: true,
      rating: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  if (!item) {
    return { ok: false, message: "这个条目已经不存在。" };
  }

  const nextStatus = nextMediaStatus(item.status as MediaStatusValue);
  if (!nextStatus) {
    return { ok: false, message: "当前状态没有下一步快捷流转。" };
  }

  const statusDates = withStatusDates({
    status: nextStatus,
    startedAt: item.startedAt,
    finishedAt: item.finishedAt,
  });

  await db.mediaItem.update({
    where: { id },
    data: {
      status: nextStatus,
      ...statusDates,
    },
  });

  if (shouldRecordStatusTransition(item.status, nextStatus, "DONE")) {
    await recordActivity("media", "done", id, mediaDoneTitle(item.type, item.title));
  }

  revalidateMedia(id);

  return {
    ok: true,
    message: "状态已更新。",
    warning: doneWithoutRatingWarning(item.type as MediaTypeValue, nextStatus, item.rating),
  };
}

export type MediaImportParseState =
  | {
      ok: true;
      fileName: string;
      parsed: ParsedMediaImportFile;
      mapping: MediaImportMapping;
    }
  | { ok: false; message: string };

export type MediaImportPayload = {
  rows: Array<Record<string, string>>;
  mapping: MediaImportMapping;
  defaults: MediaImportDefaults;
};

export type MediaImportPreviewRow = {
  rowNumber: number;
  title: string;
  type: MediaTypeValue;
  status: MediaStatusValue;
  rating: number | null;
  markedAt: string | null;
  doubanId: string | null;
  year: number | null;
  duplicate: boolean;
  error: string | null;
};

export type MediaImportPreviewState =
  | {
      ok: true;
      stats: {
        total: number;
        valid: number;
        duplicates: number;
        invalid: number;
        willImport: number;
      };
      rows: MediaImportPreviewRow[];
    }
  | { ok: false; message: string };

export type MediaImportExecuteState =
  | {
      ok: true;
      success: number;
      skipped: number;
      failed: number;
      reasons: Array<{ rowNumber: number; type: "skipped" | "failed" | "warning"; message: string }>;
    }
  | { ok: false; message: string };

function normalizeRows(payload: MediaImportPayload) {
  return payload.rows.map((row, index) => ({
    rowNumber: index + 1,
    result: normalizeMediaImportRow(row, payload.mapping, payload.defaults),
  }));
}

function weakKey(row: { type: MediaTypeValue; title: string; year: number | null }) {
  return row.year ? `${row.type}::${row.title.trim().toLowerCase()}::${row.year}` : null;
}

async function isDuplicateImportRow(
  row: { type: MediaTypeValue; title: string; year: number | null; doubanId: string | null },
  seenDoubanIds: Set<string>,
  seenWeakKeys: Set<string>,
) {
  if (row.doubanId) {
    if (seenDoubanIds.has(row.doubanId)) {
      return true;
    }

    const existing = await db.mediaItem.findUnique({
      where: { doubanId: row.doubanId },
      select: { id: true },
    });
    seenDoubanIds.add(row.doubanId);
    return Boolean(existing);
  }

  const key = weakKey(row);
  if (!key) {
    return false;
  }

  if (seenWeakKeys.has(key)) {
    return true;
  }

  const existing = await db.mediaItem.findFirst({
    where: {
      type: row.type,
      title: row.title,
      year: row.year,
    },
    select: { id: true },
  });
  seenWeakKeys.add(key);
  return Boolean(existing);
}

export async function parseMediaImportFileAction(formData: FormData): Promise<MediaImportParseState> {
  await requireMediaSession();

  const validation = validateMediaImportFile(formData.get("file"));
  if (!validation.ok) {
    return validation;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "请选择要导入的 CSV 或 XLSX 文件。" };
  }

  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    return { ok: false, message: "只支持 CSV 或 XLSX 文件。" };
  }

  try {
    const parsed = parseMediaImportFile(Buffer.from(await file.arrayBuffer()), file.name);
    if (parsed.headers.length === 0) {
      return { ok: false, message: "没有读到表头，请检查文件内容。" };
    }

    return {
      ok: true,
      fileName: file.name,
      parsed,
      mapping: guessMediaImportMapping(parsed.headers),
    };
  } catch (error) {
    if (error instanceof MediaImportLimitError) {
      return { ok: false, message: error.message };
    }

    return { ok: false, message: "文件解析失败，请确认导出文件没有损坏。" };
  }
}

export async function previewMediaImportAction(payload: MediaImportPayload): Promise<MediaImportPreviewState> {
  await requireMediaSession();

  const normalizedRows = normalizeRows(payload);
  const seenDoubanIds = new Set<string>();
  const seenWeakKeys = new Set<string>();
  const rows: MediaImportPreviewRow[] = [];
  let valid = 0;
  let duplicates = 0;
  let invalid = 0;

  for (const { rowNumber, result } of normalizedRows) {
    if (!result.ok) {
      invalid += 1;
      rows.push({
        rowNumber,
        title: "",
        type: payload.defaults.defaultType,
        status: payload.defaults.defaultStatus,
        rating: null,
        markedAt: null,
        doubanId: null,
        year: null,
        duplicate: false,
        error: result.errors.join("；"),
      });
      continue;
    }

    valid += 1;
    const duplicate = await isDuplicateImportRow(result.data, seenDoubanIds, seenWeakKeys);
    if (duplicate) {
      duplicates += 1;
    }

    if (rows.length < 20) {
      rows.push({
        rowNumber,
        title: result.data.title,
        type: result.data.type,
        status: result.data.status,
        rating: result.data.rating,
        markedAt: result.data.markedAt,
        doubanId: result.data.doubanId,
        year: result.data.year,
        duplicate,
        error: null,
      });
    }
  }

  return {
    ok: true,
    stats: {
      total: normalizedRows.length,
      valid,
      duplicates,
      invalid,
      willImport: Math.max(0, valid - duplicates),
    },
    rows,
  };
}

export async function executeMediaImportAction(payload: MediaImportPayload): Promise<MediaImportExecuteState> {
  await requireMediaSession();

  const rows: MediaImportRowData[] = normalizeRows(payload).flatMap((row) => (row.result.ok ? [row.result.data] : []));

  const result = await executeMediaImportRows(rows, {
    async hasDoubanId(doubanId) {
      return Boolean(await db.mediaItem.findUnique({ where: { doubanId }, select: { id: true } }));
    },
    async hasWeakKey(type, title, year) {
      return Boolean(
        await db.mediaItem.findFirst({
          where: { type, title, year },
          select: { id: true },
        }),
      );
    },
    async saveCover(coverUrl) {
      return (await saveFromUrl(coverUrl, "media")).url;
    },
    async createItem(data) {
      await db.mediaItem.create({ data });
    },
  });

  revalidateMedia();

  return { ok: true, ...result };
}

export async function searchMediaMetadataAction(
  type: MediaTypeValue,
  query: string,
): Promise<MediaMetadataResult | { source: "tmdb" | "neodb"; fallbackUsed: boolean; results: []; message: string }> {
  await requireMediaSession();

  try {
    return await searchMediaMetadata({ type, query });
  } catch {
    return {
      source: type === "BOOK" ? "neodb" : "tmdb",
      fallbackUsed: false,
      results: [],
      message: "联网搜索暂时不可用，你仍然可以手动填写。",
    };
  }
}

export async function localizeMediaMetadataCoverAction(
  item: MediaMetadataItem,
): Promise<{ ok: true; item: MediaMetadataItem; warning?: string } | { ok: false; message: string }> {
  await requireMediaSession();

  if (!item.coverUrl || item.coverUrl.startsWith("/uploads/")) {
    return { ok: true, item };
  }

  try {
    return {
      ok: true,
      item: {
        ...item,
        coverUrl: (await saveFromUrl(item.coverUrl, "media")).url,
      },
    };
  } catch {
    return {
      ok: true,
      item: { ...item, coverUrl: null },
      warning: "封面转存失败，已保留其他字段，你可以稍后上传封面。",
    };
  }
}
