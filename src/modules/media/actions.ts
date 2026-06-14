"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatShanghaiDate } from "@/lib/dayjs";
import { saveFromUrl } from "@/lib/storage";
import {
  applyMediaStatusDates,
  mediaStatusLabel,
  nextMediaStatus,
  normalizeMediaInput,
  type MediaStatusValue,
  type MediaTypeValue,
} from "@/modules/media/utils";

export type MediaActionState = {
  ok: boolean;
  message: string | null;
  itemId?: string;
  warning?: string;
  errors?: Partial<
    Record<
      "type" | "title" | "year" | "coverUrl" | "status" | "rating" | "startedAt" | "finishedAt" | "releaseDate" | "form",
      string
    >
  >;
};

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理书影。");
  }
}

function readTags(formData: FormData) {
  return String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function readMediaInput(formData: FormData) {
  return normalizeMediaInput({
    type: formData.get("type"),
    title: formData.get("title"),
    originalTitle: formData.get("originalTitle"),
    creator: formData.get("creator"),
    year: formData.get("year"),
    coverUrl: formData.get("coverUrl"),
    status: formData.get("status"),
    rating: formData.get("rating"),
    startedAt: formData.get("startedAt"),
    finishedAt: formData.get("finishedAt"),
    releaseDate: formData.get("releaseDate"),
    reviewMd: formData.get("reviewMd"),
    hasSpoiler: formData.get("hasSpoiler"),
    tags: readTags(formData),
  });
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
  if (id) {
    revalidatePath(`/media/${id}`);
  }
}

export async function createMediaItemAction(
  _previousState: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  await requireSession();

  const input = readMediaInput(formData);
  if (!input.ok) {
    return { ok: false, message: "请检查书影信息。", errors: input.errors };
  }

  let coverUrl: string | null;
  try {
    coverUrl = await localizeCoverUrl(input.data.coverUrl);
  } catch {
    return {
      ok: false,
      message: "封面保存失败。",
      errors: { coverUrl: "远程封面无法转存。可以改用本地上传。" },
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
  await requireSession();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { ok: false, message: "缺少要编辑的条目。", errors: { form: "书影条目不存在。" } };
  }

  const input = readMediaInput(formData);
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
  } catch {
    return {
      ok: false,
      message: "封面保存失败。",
      errors: { coverUrl: "远程封面无法转存。可以改用本地上传。" },
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

  revalidateMedia(item.id);

  return {
    ok: true,
    itemId: item.id,
    message: "书影条目已保存。",
    warning: doneWithoutRatingWarning(input.data.type, input.data.status, input.data.rating),
  };
}

export async function advanceMediaStatusAction(id: string) {
  await requireSession();

  const item = await db.mediaItem.findUnique({
    where: { id },
    select: {
      type: true,
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

  revalidateMedia(id);

  return {
    ok: true,
    message: "状态已更新。",
    warning: doneWithoutRatingWarning(item.type as MediaTypeValue, nextStatus, item.rating),
  };
}
