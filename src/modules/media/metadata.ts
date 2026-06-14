import { fetchWithRetry } from "../../lib/http";
import { extractDoubanId } from "./import-parser";
import type { MediaTypeValue } from "./utils";

export type MediaMetadataFetch = (url: string, init?: RequestInit) => Promise<Response>;

export type MediaMetadataResult = {
  source: "tmdb" | "neodb";
  fallbackUsed: boolean;
  message?: string;
  results: MediaMetadataItem[];
};

export type MediaMetadataItem = {
  source: "tmdb" | "neodb";
  sourceId: string;
  type: MediaTypeValue;
  title: string;
  originalTitle: string | null;
  creator: string | null;
  year: number | null;
  releaseDate: string | null;
  coverUrl: string | null;
  doubanId: string | null;
  tmdbId: string | null;
  isbn: string | null;
  description: string | null;
};

type SearchOptions = {
  type: MediaTypeValue;
  query: string;
  fetcher?: MediaMetadataFetch;
  tmdbApiKey?: string | null;
};

type NeoDbItem = {
  uuid?: string;
  category?: string;
  display_title?: string;
  title?: string;
  cover_image_url?: string | null;
  external_resources?: Array<{ url?: string }>;
  credits?: Array<{ role?: string; name?: string }>;
  description?: string;
  localized_title?: Array<{ text?: string }>;
};

type TmdbItem = {
  id?: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
};

const neodbCategoryMap = {
  BOOK: "book",
  MOVIE: "movie",
  TV: "tv",
} as const satisfies Record<MediaTypeValue, string>;

function firstYear(date: string | undefined) {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) ? year : null;
}

function creditNames(item: NeoDbItem, type: MediaTypeValue) {
  const preferredRoles = type === "BOOK" ? ["author", "作者"] : ["director", "导演"];
  const credits = item.credits ?? [];
  const preferred = credits.filter((credit) =>
    preferredRoles.some((role) => credit.role?.toLowerCase().includes(role.toLowerCase())),
  );
  const names = (preferred.length > 0 ? preferred : credits).map((credit) => credit.name).filter(Boolean);

  return names.length > 0 ? names.join(" / ") : null;
}

function isbnFromExternalResources(resources: NeoDbItem["external_resources"]) {
  const isbnResource = resources?.map((resource) => resource.url ?? "").find((url) => /isbn/i.test(url));
  return isbnResource?.match(/(?:isbn[:/])(\d[\d-]{8,17}[\dXx])/)?.[1]?.replace(/-/g, "") ?? null;
}

function mapNeoDbItem(item: NeoDbItem, type: MediaTypeValue): MediaMetadataItem {
  const externalUrls = item.external_resources?.map((resource) => resource.url ?? "") ?? [];
  const doubanUrl = externalUrls.find((url) => url.includes("douban.com/subject/")) ?? "";

  return {
    source: "neodb",
    sourceId: item.uuid ?? item.display_title ?? item.title ?? "",
    type,
    title: item.display_title ?? item.title ?? "",
    originalTitle: item.title && item.display_title && item.title !== item.display_title ? item.title : null,
    creator: creditNames(item, type),
    year: null,
    releaseDate: null,
    coverUrl: item.cover_image_url ?? null,
    doubanId: extractDoubanId(doubanUrl),
    tmdbId: null,
    isbn: type === "BOOK" ? isbnFromExternalResources(item.external_resources) : null,
    description: item.description ?? null,
  };
}

function mapTmdbItem(item: TmdbItem, type: MediaTypeValue): MediaMetadataItem {
  const date = type === "TV" ? item.first_air_date : item.release_date;
  const title = type === "TV" ? item.name : item.title;
  const originalTitle = type === "TV" ? item.original_name : item.original_title;

  return {
    source: "tmdb",
    sourceId: item.id ? String(item.id) : title ?? "",
    type,
    title: title ?? originalTitle ?? "",
    originalTitle: originalTitle && originalTitle !== title ? originalTitle : originalTitle ?? null,
    creator: null,
    year: firstYear(date),
    releaseDate: date || null,
    coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    doubanId: null,
    tmdbId: item.id ? String(item.id) : null,
    isbn: null,
    description: item.overview ?? null,
  };
}

async function parseJsonResponse<T>(response: Response, sourceName: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${sourceName} 返回 ${response.status}`);
  }

  return (await response.json()) as T;
}

async function searchNeoDb({
  type,
  query,
  fetcher,
}: {
  type: MediaTypeValue;
  query: string;
  fetcher: MediaMetadataFetch;
}) {
  const url = new URL("https://neodb.social/api/catalog/search");
  url.searchParams.set("query", query);
  url.searchParams.set("category", neodbCategoryMap[type]);
  url.searchParams.set("page", "1");

  const response = await fetcher(url.toString(), {
    headers: {
      accept: "application/json",
      "user-agent": "TIEDAN-Web/Stage10 (single-user media search)",
    },
  });
  const body = await parseJsonResponse<{ data?: NeoDbItem[] }>(response, "NeoDB");

  return (body.data ?? []).map((item) => mapNeoDbItem(item, type)).filter((item) => item.title);
}

function buildTmdbUrl(type: MediaTypeValue, query: string, apiKey: string) {
  const url = new URL(`https://api.themoviedb.org/3/search/${type === "TV" ? "tv" : "movie"}`);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "zh-CN");
  url.searchParams.set("page", "1");

  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey.startsWith("eyJ")) {
    headers.authorization = `Bearer ${apiKey}`;
  } else {
    url.searchParams.set("api_key", apiKey);
  }

  return { url: url.toString(), headers };
}

async function searchTmdb({
  type,
  query,
  fetcher,
  tmdbApiKey,
}: {
  type: MediaTypeValue;
  query: string;
  fetcher: MediaMetadataFetch;
  tmdbApiKey: string;
}) {
  const request = buildTmdbUrl(type, query, tmdbApiKey);
  const response = await fetcher(request.url, { headers: request.headers });
  const body = await parseJsonResponse<{ results?: TmdbItem[] }>(response, "TMDB");

  return (body.results ?? []).map((item) => mapTmdbItem(item, type)).filter((item) => item.title);
}

export async function searchMediaMetadata({
  type,
  query,
  fetcher = fetchWithRetry,
  tmdbApiKey = process.env.TMDB_API_KEY,
}: SearchOptions): Promise<MediaMetadataResult> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return { source: type === "BOOK" ? "neodb" : "tmdb", fallbackUsed: false, results: [] };
  }

  if (type === "BOOK") {
    return {
      source: "neodb",
      fallbackUsed: false,
      results: await searchNeoDb({ type, query: normalizedQuery, fetcher }),
    };
  }

  if (tmdbApiKey) {
    try {
      return {
        source: "tmdb",
        fallbackUsed: false,
        results: await searchTmdb({ type, query: normalizedQuery, fetcher, tmdbApiKey }),
      };
    } catch {
      return {
        source: "neodb",
        fallbackUsed: true,
        message: "TMDB 暂时不可用，已改用 NeoDB 搜索。",
        results: await searchNeoDb({ type, query: normalizedQuery, fetcher }),
      };
    }
  }

  return {
    source: "neodb",
    fallbackUsed: true,
    message: "没有配置 TMDB_API_KEY，已改用 NeoDB 搜索。",
    results: await searchNeoDb({ type, query: normalizedQuery, fetcher }),
  };
}
