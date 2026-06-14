import { moduleColors, type StatusColor } from "../../lib/design";

export const gameStatuses = ["WISHLIST", "BACKLOG", "PLAYING", "FINISHED", "SHELVED"] as const;
export type GameStatusValue = (typeof gameStatuses)[number];
export type GameStatusFilter = "ALL" | GameStatusValue;

export const gameStatusLabels = {
  WISHLIST: "想玩",
  BACKLOG: "库存",
  PLAYING: "在玩",
  FINISHED: "已通关",
  SHELVED: "搁置",
} as const satisfies Record<GameStatusValue, string>;

export const gameStatusBadgeMap = {
  WISHLIST: { label: gameStatusLabels.WISHLIST, color: moduleColors.games },
  BACKLOG: { label: gameStatusLabels.BACKLOG, color: moduleColors.links },
  PLAYING: { label: gameStatusLabels.PLAYING, color: moduleColors.games },
  FINISHED: { label: gameStatusLabels.FINISHED, color: moduleColors.trips },
  SHELVED: { label: gameStatusLabels.SHELVED, color: moduleColors.links },
} as const satisfies Record<GameStatusValue, StatusColor>;

export const gameSorts = ["lastPlayed", "rating", "name"] as const;
export type GameSort = (typeof gameSorts)[number];

export const gameSortLabels = {
  lastPlayed: "最近游玩",
  rating: "评分",
  name: "名称",
} as const satisfies Record<GameSort, string>;

export const defaultGameFilters = {
  status: "ALL",
  platform: "",
  tags: [],
  query: "",
  sort: "lastPlayed",
} as const satisfies GameFilters;

export type GameFilters = {
  status: GameStatusFilter;
  platform: string;
  tags: string[];
  query: string;
  sort: GameSort;
};

export type GameInput = {
  name: FormDataEntryValue | string | null;
  platform: FormDataEntryValue | string | null;
  coverUrl?: FormDataEntryValue | string | null;
  status?: FormDataEntryValue | string | null;
  rating?: FormDataEntryValue | string | null;
  playtimeHours?: FormDataEntryValue | string | number | null;
  lastPlayedAt?: FormDataEntryValue | string | null;
  tags?: FormDataEntryValue | string | string[] | null;
  reviewMd?: FormDataEntryValue | string | null;
};

export type NormalizedGameInput =
  | {
      ok: true;
      data: {
        name: string;
        platform: string;
        coverUrl: string | null;
        status: GameStatusValue;
        rating: number | null;
        playtimeMin: number;
        lastPlayedAt: Date | null;
        tags: string[];
        reviewMd: string | null;
      };
    }
  | {
      ok: false;
      errors: Partial<
        Record<"name" | "platform" | "coverUrl" | "status" | "rating" | "playtimeHours" | "lastPlayedAt", string>
      >;
    };

function stringValue(value: FormDataEntryValue | string | number | null | undefined) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

export function isGameStatus(value: string): value is GameStatusValue {
  return gameStatuses.includes(value as GameStatusValue);
}

function isGameSort(value: string): value is GameSort {
  return gameSorts.includes(value as GameSort);
}

export function normalizeGameTags(rawTags: GameInput["tags"]) {
  const values = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === "string"
      ? rawTags.split(",")
      : [];

  return Array.from(
    new Set(values.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean)),
  );
}

type FieldResult<T> = { value: T } | { error: string };

function normalizeRating(rawRating: FormDataEntryValue | string | null | undefined): FieldResult<number | null> {
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

function normalizePlaytime(rawHours: FormDataEntryValue | string | number | null | undefined): FieldResult<number> {
  const value = stringValue(rawHours);

  if (!value) {
    return { value: 0 };
  }

  const hours = Number(value);
  if (!Number.isFinite(hours)) {
    return { error: "已玩时长必须是数字。" };
  }

  if (hours < 0) {
    return { error: "已玩时长不能小于 0。" };
  }

  return { value: Math.round(hours * 60) };
}

function normalizeDateTime(rawDate: FormDataEntryValue | string | null | undefined): FieldResult<Date | null> {
  const value = stringValue(rawDate);

  if (!value) {
    return { value: null };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: "最近游玩时间格式不正确。" };
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

export function normalizeGameInput(input: GameInput): NormalizedGameInput {
  const name = stringValue(input.name);
  const platform = stringValue(input.platform);
  const coverUrl = stringValue(input.coverUrl);
  const status = stringValue(input.status) || "BACKLOG";
  const reviewMd = stringValue(input.reviewMd);
  const rating = normalizeRating(input.rating);
  const playtime = normalizePlaytime(input.playtimeHours);
  const lastPlayedAt = normalizeDateTime(input.lastPlayedAt);
  const errors: Extract<NormalizedGameInput, { ok: false }>["errors"] = {};

  if (!name) {
    errors.name = "名称不能为空。";
  }

  if (!platform) {
    errors.platform = "平台不能为空。";
  }

  if (coverUrl && !isAllowedCoverUrl(coverUrl)) {
    errors.coverUrl = "封面必须是 /uploads/ 路径或 http(s) 图片链接。";
  }

  if (!isGameStatus(status)) {
    errors.status = "请选择有效的游戏状态。";
  }

  if ("error" in rating) {
    errors.rating = rating.error;
  }

  if ("error" in playtime) {
    errors.playtimeHours = playtime.error;
  }

  if ("error" in lastPlayedAt) {
    errors.lastPlayedAt = lastPlayedAt.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      platform,
      coverUrl: coverUrl || null,
      status: status as GameStatusValue,
      rating: "value" in rating ? rating.value : null,
      playtimeMin: "value" in playtime ? playtime.value : 0,
      lastPlayedAt: "value" in lastPlayedAt ? lastPlayedAt.value : null,
      tags: normalizeGameTags(input.tags),
      reviewMd: reviewMd || null,
    },
  };
}

function firstParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseGameFilters(params: Record<string, string | string[] | undefined>): GameFilters {
  const status = firstParamValue(params.status)?.trim() ?? "";
  const sort = firstParamValue(params.sort)?.trim() ?? "";

  return {
    status: isGameStatus(status) ? status : defaultGameFilters.status,
    platform: firstParamValue(params.platform)?.trim() ?? "",
    tags: normalizeGameTags(firstParamValue(params.tags) ?? ""),
    query: firstParamValue(params.q)?.trim() ?? "",
    sort: isGameSort(sort) ? sort : defaultGameFilters.sort,
  };
}

export function nextGameStatus(status: GameStatusValue) {
  if (status === "WISHLIST" || status === "BACKLOG") {
    return "PLAYING";
  }

  if (status === "PLAYING") {
    return "FINISHED";
  }

  return null;
}

export function gameStatusFlowLabel(status: GameStatusValue) {
  const nextStatus = nextGameStatus(status);

  return nextStatus ? `标记为${gameStatusLabels[nextStatus]}` : null;
}
