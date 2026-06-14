import { formatShanghaiDate } from "../../lib/dayjs";
import { moduleColors, type StatusColor } from "../../lib/design";

export const mediaTypes = ["BOOK", "MOVIE", "TV"] as const;
export type MediaTypeValue = (typeof mediaTypes)[number];

export const mediaStatuses = ["WISHLIST", "DOING", "DONE", "DROPPED"] as const;
export type MediaStatusValue = (typeof mediaStatuses)[number];
export type MediaStatusFilter = "ALL" | MediaStatusValue;

export const mediaTypeLabels = {
  BOOK: "图书",
  MOVIE: "电影",
  TV: "剧集",
} as const satisfies Record<MediaTypeValue, string>;

export const mediaTypeUnitLabels = {
  BOOK: "本",
  MOVIE: "部",
  TV: "部",
} as const satisfies Record<MediaTypeValue, string>;

export const mediaCreatorLabels = {
  BOOK: "作者",
  MOVIE: "导演",
  TV: "导演",
} as const satisfies Record<MediaTypeValue, string>;

export const mediaStatusLabels = {
  WISHLIST: "想看",
  DOING: "在看",
  DONE: "看过",
  DROPPED: "弃",
} as const satisfies Record<MediaStatusValue, string>;

export const bookStatusLabels = {
  WISHLIST: "想读",
  DOING: "在读",
  DONE: "读过",
  DROPPED: "弃",
} as const satisfies Record<MediaStatusValue, string>;

export const mediaStatusBadgeMap = {
  WISHLIST: { label: mediaStatusLabels.WISHLIST, color: moduleColors.media },
  DOING: { label: mediaStatusLabels.DOING, color: moduleColors.media },
  DONE: { label: mediaStatusLabels.DONE, color: moduleColors.trips },
  DROPPED: { label: mediaStatusLabels.DROPPED, color: moduleColors.links },
} as const satisfies Record<MediaStatusValue, StatusColor>;

export type MediaFilters = {
  type: MediaTypeValue;
  status: MediaStatusFilter;
  tags: string[];
  query: string;
};

export const defaultMediaFilters = {
  type: "BOOK",
  status: "ALL",
  tags: [],
  query: "",
} as const satisfies MediaFilters;

export type MediaInput = {
  type?: FormDataEntryValue | string | null;
  title: FormDataEntryValue | string | null;
  originalTitle?: FormDataEntryValue | string | null;
  creator?: FormDataEntryValue | string | null;
  year?: FormDataEntryValue | string | number | null;
  coverUrl?: FormDataEntryValue | string | null;
  doubanId?: FormDataEntryValue | string | null;
  tmdbId?: FormDataEntryValue | string | null;
  isbn?: FormDataEntryValue | string | null;
  status?: FormDataEntryValue | string | null;
  rating?: FormDataEntryValue | string | null;
  startedAt?: FormDataEntryValue | string | null;
  finishedAt?: FormDataEntryValue | string | null;
  releaseDate?: FormDataEntryValue | string | null;
  reviewMd?: FormDataEntryValue | string | null;
  hasSpoiler?: FormDataEntryValue | string | boolean | null;
  tags?: FormDataEntryValue | string | string[] | null;
};

export type NormalizedMediaInput =
  | {
      ok: true;
      data: {
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
    }
  | {
      ok: false;
      errors: Partial<
        Record<
          "type" | "title" | "year" | "coverUrl" | "status" | "rating" | "startedAt" | "finishedAt" | "releaseDate",
          string
        >
      >;
    };

type FieldResult<T> = { value: T } | { error: string };

function stringValue(value: FormDataEntryValue | string | number | boolean | null | undefined) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value).trim()
    : "";
}

export function isMediaType(value: string): value is MediaTypeValue {
  return mediaTypes.includes(value as MediaTypeValue);
}

export function isMediaStatus(value: string): value is MediaStatusValue {
  return mediaStatuses.includes(value as MediaStatusValue);
}

export function mediaStatusLabel(type: MediaTypeValue, status: MediaStatusValue) {
  return type === "BOOK" ? bookStatusLabels[status] : mediaStatusLabels[status];
}

export function mediaStatusMapForType(type: MediaTypeValue) {
  return Object.fromEntries(
    mediaStatuses.map((status) => [
      status,
      {
        ...mediaStatusBadgeMap[status],
        label: mediaStatusLabel(type, status),
      },
    ]),
  ) as Record<MediaStatusValue, StatusColor>;
}

export function normalizeMediaTags(rawTags: MediaInput["tags"]) {
  const values = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === "string"
      ? rawTags.split(",")
      : [];

  return Array.from(
    new Set(values.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean)),
  );
}

function normalizeYear(rawYear: MediaInput["year"]): FieldResult<number | null> {
  const value = stringValue(rawYear);

  if (!value) {
    return { value: null };
  }

  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { error: "年份必须在 1900 到 2100 之间。" };
  }

  return { value: year };
}

function normalizeRating(rawRating: MediaInput["rating"]): FieldResult<number | null> {
  const value = stringValue(rawRating);

  if (!value || value === "0") {
    return { value: null };
  }

  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return { error: "评分必须是 1 到 10 的整数。" };
  }

  return { value: rating };
}

function normalizeDate(rawDate: FormDataEntryValue | string | null | undefined, label: string): FieldResult<Date | null> {
  const value = stringValue(rawDate);

  if (!value) {
    return { value: null };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: `${label}格式不正确。` };
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatShanghaiDate(date) !== value) {
    return { error: `${label}格式不正确。` };
  }

  return { value: date };
}

function isAllowedCoverUrl(value: string) {
  if (value.startsWith("/uploads/")) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeHasSpoiler(value: MediaInput["hasSpoiler"]) {
  if (typeof value === "boolean") {
    return value;
  }

  const raw = stringValue(value).toLowerCase();
  return raw === "on" || raw === "true" || raw === "1";
}

export function normalizeMediaInput(input: MediaInput): NormalizedMediaInput {
  const type = stringValue(input.type) || defaultMediaFilters.type;
  const title = stringValue(input.title);
  const originalTitle = stringValue(input.originalTitle);
  const creator = stringValue(input.creator);
  const coverUrl = stringValue(input.coverUrl);
  const doubanId = stringValue(input.doubanId);
  const tmdbId = stringValue(input.tmdbId);
  const isbn = stringValue(input.isbn);
  const status = stringValue(input.status) || "WISHLIST";
  const reviewMd = stringValue(input.reviewMd);
  const year = normalizeYear(input.year);
  const rating = normalizeRating(input.rating);
  const startedAt = normalizeDate(input.startedAt, "开始日期");
  const finishedAt = normalizeDate(input.finishedAt, "完成日期");
  const releaseDate = normalizeDate(input.releaseDate, "上映/出版日期");
  const errors: Extract<NormalizedMediaInput, { ok: false }>["errors"] = {};

  if (!isMediaType(type)) {
    errors.type = "请选择有效的书影类型。";
  }

  if (!title) {
    errors.title = "标题不能为空。";
  }

  if (coverUrl && !isAllowedCoverUrl(coverUrl)) {
    errors.coverUrl = "封面必须是 /uploads/ 路径或 http(s) 图片链接。";
  }

  if (!isMediaStatus(status)) {
    errors.status = "请选择有效的书影状态。";
  }

  if ("error" in year) {
    errors.year = year.error;
  }

  if ("error" in rating) {
    errors.rating = rating.error;
  }

  if ("error" in startedAt) {
    errors.startedAt = startedAt.error;
  }

  if ("error" in finishedAt) {
    errors.finishedAt = finishedAt.error;
  }

  if ("error" in releaseDate) {
    errors.releaseDate = releaseDate.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      type: type as MediaTypeValue,
      title,
      originalTitle: originalTitle || null,
      creator: creator || null,
      year: "value" in year ? year.value : null,
      coverUrl: coverUrl || null,
      doubanId: doubanId || null,
      tmdbId: tmdbId || null,
      isbn: isbn || null,
      status: status as MediaStatusValue,
      rating: "value" in rating ? rating.value : null,
      startedAt: "value" in startedAt ? startedAt.value : null,
      finishedAt: "value" in finishedAt ? finishedAt.value : null,
      releaseDate: "value" in releaseDate ? releaseDate.value : null,
      reviewMd: reviewMd || null,
      hasSpoiler: normalizeHasSpoiler(input.hasSpoiler),
      tags: normalizeMediaTags(input.tags),
    },
  };
}

function firstParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseMediaFilters(params: Record<string, string | string[] | undefined>): MediaFilters {
  const type = firstParamValue(params.type)?.trim() ?? "";
  const status = firstParamValue(params.status)?.trim() ?? "";

  return {
    type: isMediaType(type) ? type : defaultMediaFilters.type,
    status: isMediaStatus(status) ? status : defaultMediaFilters.status,
    tags: normalizeMediaTags(firstParamValue(params.tags) ?? ""),
    query: firstParamValue(params.q)?.trim() ?? "",
  };
}

export function nextMediaStatus(status: MediaStatusValue) {
  if (status === "WISHLIST") {
    return "DOING";
  }

  if (status === "DOING") {
    return "DONE";
  }

  return null;
}

export function mediaStatusFlowLabel(type: MediaTypeValue, status: MediaStatusValue) {
  const nextStatus = nextMediaStatus(status);
  return nextStatus ? `标记为${mediaStatusLabel(type, nextStatus)}` : null;
}

export function applyMediaStatusDates({
  previousStatus,
  status,
  startedAt,
  finishedAt,
  today,
}: {
  previousStatus?: MediaStatusValue;
  status: MediaStatusValue;
  startedAt: Date | null;
  finishedAt: Date | null;
  today: Date;
}) {
  const enteredDoing = previousStatus === undefined || previousStatus !== "DOING";
  const enteredDone = previousStatus === undefined || previousStatus !== "DONE";

  return {
    startedAt: status === "DOING" && enteredDoing && !startedAt ? today : startedAt,
    finishedAt: status === "DONE" && enteredDone && !finishedAt ? today : finishedAt,
  };
}

export function dateInputValue(date: Date | null) {
  return date ? formatShanghaiDate(date) : "";
}
