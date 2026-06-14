import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { formatShanghaiDateTime, toShanghaiTime } from "@/lib/dayjs";
import {
  type GameFilters,
  type GameSort,
  type GameStatusValue,
  gameStatuses,
  parseGameFilters,
} from "@/modules/games/utils";

export type GameSearchParams = Record<string, string | string[] | undefined>;

export type GameListItem = {
  id: string;
  source: string;
  steamAppId: number | null;
  name: string;
  platform: string;
  coverUrl: string | null;
  status: GameStatusValue;
  rating: number | null;
  playtimeMin: number;
  playtime2w: number;
  lastPlayedAt: string | null;
  lastPlayedInput: string;
  reviewMd: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type GamesPageData = {
  filters: GameFilters;
  games: GameListItem[];
  statusCounts: Record<"ALL" | GameStatusValue, number>;
  platforms: string[];
  tags: string[];
  stats: {
    total: number;
    finished: number;
    playtimeHours: number;
  };
};

function dateTimeInputValue(date: Date | null) {
  return date ? toShanghaiTime(date).format("YYYY-MM-DDTHH:mm") : "";
}

function serializeGame(game: {
  id: string;
  source: string;
  steamAppId: number | null;
  name: string;
  platform: string;
  coverUrl: string | null;
  status: string;
  rating: number | null;
  playtimeMin: number;
  playtime2w: number;
  lastPlayedAt: Date | null;
  reviewMd: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}): GameListItem {
  return {
    id: game.id,
    source: game.source,
    steamAppId: game.steamAppId,
    name: game.name,
    platform: game.platform,
    coverUrl: game.coverUrl,
    status: game.status as GameStatusValue,
    rating: game.rating,
    playtimeMin: game.playtimeMin,
    playtime2w: game.playtime2w,
    lastPlayedAt: game.lastPlayedAt ? formatShanghaiDateTime(game.lastPlayedAt) : null,
    lastPlayedInput: dateTimeInputValue(game.lastPlayedAt),
    reviewMd: game.reviewMd ?? "",
    tags: game.tags,
    createdAt: formatShanghaiDateTime(game.createdAt),
    updatedAt: formatShanghaiDateTime(game.updatedAt),
  };
}

function buildWhere(filters: GameFilters, options: { includeStatus: boolean }): Prisma.GameWhereInput {
  const and: Prisma.GameWhereInput[] = [];

  if (options.includeStatus && filters.status !== "ALL") {
    and.push({ status: filters.status });
  }

  if (filters.platform) {
    and.push({ platform: filters.platform });
  }

  if (filters.tags.length > 0) {
    and.push({ tags: { hasEvery: filters.tags } });
  }

  if (filters.query) {
    and.push({
      name: {
        contains: filters.query,
        mode: "insensitive",
      },
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function gameOrderBy(sort: GameSort): Prisma.GameOrderByWithRelationInput[] {
  if (sort === "rating") {
    return [{ rating: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }];
  }

  if (sort === "name") {
    return [{ name: "asc" }, { updatedAt: "desc" }];
  }

  return [{ lastPlayedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }];
}

export async function getGamesPageData(searchParams: GameSearchParams): Promise<GamesPageData> {
  const filters = parseGameFilters(searchParams);
  const listWhere = buildWhere(filters, { includeStatus: true });
  const baseWhere = buildWhere(filters, { includeStatus: false });

  const [games, groupedStatusCounts, total, finished, playtime, platformRows, tagRows] = await Promise.all([
    db.game.findMany({
      where: listWhere,
      orderBy: gameOrderBy(filters.sort),
    }),
    db.game.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    db.game.count({ where: baseWhere }),
    db.game.count({ where: { AND: [baseWhere, { status: "FINISHED" }] } }),
    db.game.aggregate({
      where: baseWhere,
      _sum: { playtimeMin: true },
    }),
    db.game.findMany({
      where: buildWhere({ ...filters, platform: "" }, { includeStatus: false }),
      distinct: ["platform"],
      select: { platform: true },
      orderBy: { platform: "asc" },
    }),
    db.game.findMany({
      where: buildWhere({ ...filters, tags: [] }, { includeStatus: false }),
      select: { tags: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(gameStatuses.map((status) => [status, 0])) as Record<GameStatusValue, number>;
  for (const row of groupedStatusCounts) {
    statusCounts[row.status as GameStatusValue] = row._count._all;
  }

  const tags = Array.from(new Set(tagRows.flatMap((row) => row.tags))).sort((a, b) => a.localeCompare(b, "zh-CN"));

  return {
    filters,
    games: games.map(serializeGame),
    statusCounts: {
      ALL: total,
      ...statusCounts,
    },
    platforms: platformRows.map((row) => row.platform),
    tags,
    stats: {
      total,
      finished,
      playtimeHours: Math.round(((playtime._sum.playtimeMin ?? 0) / 60) * 10) / 10,
    },
  };
}
