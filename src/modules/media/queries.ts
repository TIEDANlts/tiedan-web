import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { formatShanghaiDate, formatShanghaiDateTime, toShanghaiTime } from "@/lib/dayjs";
import {
  dateInputValue,
  type MediaFilters,
  type MediaStatusValue,
  type MediaTypeValue,
  mediaStatuses,
  mediaTypes,
  parseMediaFilters,
} from "@/modules/media/utils";

export type MediaSearchParams = Record<string, string | string[] | undefined>;

export type MediaListItem = {
  id: string;
  type: MediaTypeValue;
  title: string;
  originalTitle: string | null;
  creator: string | null;
  year: number | null;
  coverUrl: string | null;
  status: MediaStatusValue;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  releaseDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type MediaDetailItem = MediaListItem & {
  startedInput: string;
  finishedInput: string;
  releaseInput: string;
  reviewMd: string;
  hasSpoiler: boolean;
};

export type MediaPageData = {
  filters: MediaFilters;
  items: MediaListItem[];
  statusCounts: Record<"ALL" | MediaStatusValue, number>;
  typeCounts: Record<MediaTypeValue, number>;
  tags: string[];
  stats: {
    year: number;
    booksDone: number;
    moviesDone: number;
    tvDone: number;
  };
};

function serializeListItem(item: {
  id: string;
  type: string;
  title: string;
  originalTitle: string | null;
  creator: string | null;
  year: number | null;
  coverUrl: string | null;
  status: string;
  rating: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  releaseDate: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}): MediaListItem {
  return {
    id: item.id,
    type: item.type as MediaTypeValue,
    title: item.title,
    originalTitle: item.originalTitle,
    creator: item.creator,
    year: item.year,
    coverUrl: item.coverUrl,
    status: item.status as MediaStatusValue,
    rating: item.rating,
    startedAt: item.startedAt ? formatShanghaiDate(item.startedAt) : null,
    finishedAt: item.finishedAt ? formatShanghaiDate(item.finishedAt) : null,
    releaseDate: item.releaseDate ? formatShanghaiDate(item.releaseDate) : null,
    tags: item.tags,
    createdAt: formatShanghaiDateTime(item.createdAt),
    updatedAt: formatShanghaiDateTime(item.updatedAt),
  };
}

function serializeDetailItem(item: Prisma.MediaItemGetPayload<Record<string, never>>): MediaDetailItem {
  return {
    ...serializeListItem(item),
    startedInput: dateInputValue(item.startedAt),
    finishedInput: dateInputValue(item.finishedAt),
    releaseInput: dateInputValue(item.releaseDate),
    reviewMd: item.reviewMd ?? "",
    hasSpoiler: item.hasSpoiler,
  };
}

function buildWhere(filters: MediaFilters, options: { includeStatus: boolean }): Prisma.MediaItemWhereInput {
  const and: Prisma.MediaItemWhereInput[] = [{ type: filters.type }];

  if (options.includeStatus && filters.status !== "ALL") {
    and.push({ status: filters.status });
  }

  if (filters.tags.length > 0) {
    and.push({ tags: { hasEvery: filters.tags } });
  }

  if (filters.query) {
    and.push({
      OR: [
        { title: { contains: filters.query, mode: "insensitive" } },
        { originalTitle: { contains: filters.query, mode: "insensitive" } },
        { creator: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }

  return { AND: and };
}

function mediaOrderBy(filters: MediaFilters): Prisma.MediaItemOrderByWithRelationInput[] {
  if (filters.status === "DONE") {
    return [{ finishedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }];
  }

  if (filters.status === "DOING") {
    return [{ startedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }];
  }

  if (filters.status === "WISHLIST") {
    return [{ releaseDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }];
  }

  return [{ updatedAt: "desc" }];
}

function currentYearRange() {
  const year = toShanghaiTime().year();

  return {
    year,
    start: new Date(`${year}-01-01T00:00:00.000Z`),
    end: new Date(`${year + 1}-01-01T00:00:00.000Z`),
  };
}

function finishedThisYearWhere(type: MediaTypeValue, start: Date, end: Date): Prisma.MediaItemWhereInput {
  return {
    type,
    status: "DONE",
    finishedAt: {
      gte: start,
      lt: end,
    },
  };
}

export async function getMediaPageData(searchParams: MediaSearchParams): Promise<MediaPageData> {
  const filters = parseMediaFilters(searchParams);
  const listWhere = buildWhere(filters, { includeStatus: true });
  const baseWhere = buildWhere(filters, { includeStatus: false });
  const yearRange = currentYearRange();

  const [
    items,
    groupedStatusCounts,
    total,
    groupedTypeCounts,
    tagRows,
    booksDone,
    moviesDone,
    tvDone,
  ] = await Promise.all([
    db.mediaItem.findMany({
      where: listWhere,
      orderBy: mediaOrderBy(filters),
    }),
    db.mediaItem.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    db.mediaItem.count({ where: baseWhere }),
    db.mediaItem.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),
    db.mediaItem.findMany({
      where: buildWhere({ ...filters, tags: [] }, { includeStatus: false }),
      select: { tags: true },
    }),
    db.mediaItem.count({ where: finishedThisYearWhere("BOOK", yearRange.start, yearRange.end) }),
    db.mediaItem.count({ where: finishedThisYearWhere("MOVIE", yearRange.start, yearRange.end) }),
    db.mediaItem.count({ where: finishedThisYearWhere("TV", yearRange.start, yearRange.end) }),
  ]);

  const statusCounts = Object.fromEntries(mediaStatuses.map((status) => [status, 0])) as Record<MediaStatusValue, number>;
  for (const row of groupedStatusCounts) {
    statusCounts[row.status as MediaStatusValue] = row._count._all;
  }

  const typeCounts = Object.fromEntries(mediaTypes.map((type) => [type, 0])) as Record<MediaTypeValue, number>;
  for (const row of groupedTypeCounts) {
    typeCounts[row.type as MediaTypeValue] = row._count._all;
  }

  const tags = Array.from(new Set(tagRows.flatMap((row) => row.tags))).sort((a, b) => a.localeCompare(b, "zh-CN"));

  return {
    filters,
    items: items.map(serializeListItem),
    statusCounts: {
      ALL: total,
      ...statusCounts,
    },
    typeCounts,
    tags,
    stats: {
      year: yearRange.year,
      booksDone,
      moviesDone,
      tvDone,
    },
  };
}

export async function getMediaDetail(id: string) {
  const item = await db.mediaItem.findUnique({
    where: { id },
  });

  return item ? serializeDetailItem(item) : null;
}
