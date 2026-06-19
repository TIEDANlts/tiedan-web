import { TextDecoder } from "node:util";
import iconv from "iconv-lite";
import * as XLSX from "xlsx";

import {
  isMediaStatus,
  isMediaType,
  type MediaStatusValue,
  type MediaTypeValue,
} from "./utils";

export type MediaImportEncoding = "utf8" | "gbk";

export type MediaImportMapping = {
  title: string | null;
  type: string | null;
  rating: string | null;
  review: string | null;
  markedAt: string | null;
  link: string | null;
  year: string | null;
  coverUrl: string | null;
  status: string | null;
};

export type MediaImportDefaults = {
  defaultType: MediaTypeValue;
  defaultStatus: MediaStatusValue;
  statusValueMap: Record<string, MediaStatusValue>;
};

export type MediaImportRowData = {
  type: MediaTypeValue;
  title: string;
  status: MediaStatusValue;
  rating: number | null;
  reviewMd: string | null;
  markedAt: string | null;
  doubanId: string | null;
  year: number | null;
  coverUrl: string | null;
};

export type NormalizedMediaImportRow =
  | { ok: true; data: MediaImportRowData }
  | { ok: false; errors: string[]; raw: Record<string, string> };

export type ParsedMediaImportFile = {
  headers: string[];
  rows: Array<Record<string, string>>;
  encoding: MediaImportEncoding | null;
};

export const MEDIA_IMPORT_MAX_ROWS = 20000;
export const MEDIA_IMPORT_MAX_COLUMNS = 100;

export class MediaImportLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaImportLimitError";
  }
}

const headerKeywords: Record<keyof MediaImportMapping, string[]> = {
  title: ["书影音名", "标题", "名称", "片名", "书名", "title", "name"],
  type: ["类型", "类别", "分类", "type", "category"],
  rating: ["我的评分", "评分", "星", "rating", "rate"],
  review: ["短评", "评论", "评价", "感想", "review", "comment"],
  markedAt: ["标记日期", "标记时间", "日期", "时间", "date", "marked"],
  link: ["豆瓣链接", "链接", "url", "网址", "link", "subject"],
  year: ["年份", "出版年份", "上映年份", "year"],
  coverUrl: ["封面", "图片", "海报", "cover", "poster", "image"],
  status: ["状态", "观看状态", "阅读状态", "收藏状态", "status"],
};

function trimCell(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value).trim()
    : "";
}

function compactRows(sheetRows: unknown[][]) {
  const rows = sheetRows
    .map((row) => row.map(trimCell))
    .filter((row) => row.some(Boolean));
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);

  if (rows.length > MEDIA_IMPORT_MAX_ROWS) {
    throw new MediaImportLimitError(`导入文件不能超过 ${MEDIA_IMPORT_MAX_ROWS} 行，请拆分后再导入。`);
  }

  if (maxColumns > MEDIA_IMPORT_MAX_COLUMNS) {
    throw new MediaImportLimitError(`导入文件不能超过 ${MEDIA_IMPORT_MAX_COLUMNS} 列，请删减后再导入。`);
  }

  const headers = rows[0] ?? [];

  return {
    headers,
    rows: rows.slice(1).map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
    ),
  };
}

function parseWorkbook(bufferOrText: Buffer | string, type: "buffer" | "string") {
  const workbook = XLSX.read(bufferOrText, { type, raw: true });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;

  if (!firstSheet) {
    return { headers: [], rows: [] };
  }

  return compactRows(
    XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
      header: 1,
      defval: "",
      raw: false,
    }),
  );
}

export function decodeMediaCsv(buffer: Buffer): { text: string; encoding: MediaImportEncoding } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);

    if (!text.includes("\uFFFD")) {
      return { text: text.replace(/^\uFEFF/, ""), encoding: "utf8" };
    }
  } catch {
    // Fall through to GBK.
  }

  return {
    text: iconv.decode(buffer, "gbk").replace(/^\uFEFF/, ""),
    encoding: "gbk",
  };
}

export function parseMediaImportFile(buffer: Buffer, filename: string): ParsedMediaImportFile {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    return { ...parseWorkbook(buffer, "buffer"), encoding: null };
  }

  const decoded = decodeMediaCsv(buffer);
  return {
    ...parseWorkbook(decoded.text, "string"),
    encoding: decoded.encoding,
  };
}

function normalizedHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, "");
}

function findHeader(headers: string[], keywords: string[]) {
  const normalized = headers.map((header) => ({ header, normalized: normalizedHeader(header) }));

  return (
    normalized.find(({ normalized: header }) =>
      keywords.some((keyword) => header === normalizedHeader(keyword)),
    )?.header ??
    normalized.find(({ normalized: header }) =>
      keywords.some((keyword) => header.includes(normalizedHeader(keyword))),
    )?.header ??
    null
  );
}

export function guessMediaImportMapping(headers: string[]): MediaImportMapping {
  return {
    title: findHeader(headers, headerKeywords.title),
    type: findHeader(headers, headerKeywords.type),
    rating: findHeader(headers, headerKeywords.rating),
    review: findHeader(headers, headerKeywords.review),
    markedAt: findHeader(headers, headerKeywords.markedAt),
    link: findHeader(headers, headerKeywords.link),
    year: findHeader(headers, headerKeywords.year),
    coverUrl: findHeader(headers, headerKeywords.coverUrl),
    status: findHeader(headers, headerKeywords.status),
  };
}

function readMapped(row: Record<string, string>, header: string | null) {
  return header ? row[header]?.trim() ?? "" : "";
}

export function extractDoubanId(url: string) {
  return url.match(/subject\/(\d+)/)?.[1] ?? null;
}

function normalizeImportType(rawType: string, defaultType: MediaTypeValue): MediaTypeValue {
  const normalized = rawType.trim().toLowerCase();

  if (isMediaType(normalized)) {
    return normalized;
  }

  if (/(book|图书|书籍|书)/i.test(normalized)) {
    return "BOOK";
  }

  if (/(movie|film|电影|影片)/i.test(normalized)) {
    return "MOVIE";
  }

  if (/(tv|season|剧集|剧|电视剧|番剧)/i.test(normalized)) {
    return "TV";
  }

  return defaultType;
}

function normalizeImportStatus(
  rawStatus: string,
  defaultStatus: MediaStatusValue,
  statusValueMap: Record<string, MediaStatusValue>,
): MediaStatusValue {
  const mapped = statusValueMap[rawStatus.trim()];
  if (mapped) {
    return mapped;
  }

  const normalized = rawStatus.trim().toUpperCase();
  if (isMediaStatus(normalized)) {
    return normalized;
  }

  if (/想(读|看)|wishlist/i.test(rawStatus)) {
    return "WISHLIST";
  }

  if (/在(读|看)|doing|progress/i.test(rawStatus)) {
    return "DOING";
  }

  if (/读过|看过|完成|done|complete/i.test(rawStatus)) {
    return "DONE";
  }

  if (/弃|dropped/i.test(rawStatus)) {
    return "DROPPED";
  }

  return defaultStatus;
}

function normalizeRating(rawRating: string) {
  const raw = rawRating.trim();

  if (!raw || raw === "0") {
    return null;
  }

  const number = Number(raw.match(/\d+(?:\.\d+)?/)?.[0] ?? Number.NaN);
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  if (raw.includes("星") || number <= 5) {
    return Math.min(10, Math.round(number * 2));
  }

  if (number <= 10) {
    return Math.round(number);
  }

  return null;
}

function normalizeDateText(rawDate: string) {
  const value = rawDate.trim();
  const match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeYear(rawYear: string) {
  const year = Number(rawYear.match(/\d{4}/)?.[0] ?? Number.NaN);

  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

export function normalizeMediaImportRow(
  row: Record<string, string>,
  mapping: MediaImportMapping,
  defaults: MediaImportDefaults,
): NormalizedMediaImportRow {
  const title = readMapped(row, mapping.title);
  const errors: string[] = [];

  if (!title) {
    errors.push("标题为空。");
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw: row };
  }

  const link = readMapped(row, mapping.link);

  return {
    ok: true,
    data: {
      title,
      type: normalizeImportType(readMapped(row, mapping.type), defaults.defaultType),
      status: normalizeImportStatus(readMapped(row, mapping.status), defaults.defaultStatus, defaults.statusValueMap),
      rating: normalizeRating(readMapped(row, mapping.rating)),
      reviewMd: readMapped(row, mapping.review) || null,
      markedAt: normalizeDateText(readMapped(row, mapping.markedAt)),
      doubanId: extractDoubanId(link),
      year: normalizeYear(readMapped(row, mapping.year)),
      coverUrl: readMapped(row, mapping.coverUrl) || null,
    },
  };
}
