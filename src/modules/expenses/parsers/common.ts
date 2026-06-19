import { TextDecoder } from "node:util";
import iconv from "iconv-lite";
import * as XLSX from "xlsx";

import type {
  ExpenseImportEncoding,
  ExpenseImportParserOptions,
  FilteredExpenseImportRow,
  ParsedExpenseImportFile,
  ParsedExpenseImportRow,
} from "./types";
import type { TxnDirectionValue } from "../utils";

const filteredStatuses = new Set(["交易关闭", "已全额退款"]);

export const EXPENSE_IMPORT_MAX_ROWS = 20000;
export const EXPENSE_IMPORT_MAX_COLUMNS = 100;

function cleanText(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value).replace(/^\uFEFF/, "").trim()
    : "";
}

function decodeUtf8(buffer: Buffer) {
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
}

export function decodeExpenseCsv(buffer: Buffer): { text: string; encoding: ExpenseImportEncoding } {
  try {
    const text = decodeUtf8(buffer);
    if (!text.includes("\uFFFD")) {
      return { text, encoding: "utf8" };
    }
  } catch {
    // Fall through to GBK.
  }

  return {
    text: iconv.decode(buffer, "gbk").replace(/^\uFEFF/, ""),
    encoding: "gbk",
  };
}

function readSheetRows(text: string) {
  const workbook = XLSX.read(text, { type: "string", raw: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;

  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

function importLimitError(
  options: ExpenseImportParserOptions,
  encoding: ExpenseImportEncoding,
  message: string,
): ParsedExpenseImportFile {
  return {
    platform: options.platform,
    encoding,
    rows: [],
    filteredRows: [],
    errors: [{ rowNumber: 0, txnNo: null, message, raw: {} }],
  };
}

function findHeaderIndex(rows: string[][]) {
  return rows.findIndex((row) => row.some((cell) => cell === "交易时间"));
}

function rowToObject(headers: string[], row: string[]) {
  // 关键：按表头的「原始下标」对齐数据列。空表头单元格直接跳过，
  // 但不能压缩下标——否则空列后面的所有字段都会读到错位的数据列。
  const entries: [string, string][] = [];

  headers.forEach((header, index) => {
    if (header) {
      entries.push([header, row[index] ?? ""]);
    }
  });

  return Object.fromEntries(entries);
}

function readRequired(raw: Record<string, string>, header: string) {
  return raw[header]?.trim() ?? "";
}

function normalizeDirection(rawDirection: string): TxnDirectionValue | null {
  if (rawDirection === "支出") {
    return "EXPENSE";
  }

  if (rawDirection === "收入") {
    return "INCOME";
  }

  if (rawDirection === "不计收支") {
    return "NEUTRAL";
  }

  return null;
}

function normalizeAmount(rawAmount: string) {
  const amount = rawAmount.replace(/[¥￥,\s]/g, "");
  const match = amount.match(/^\d+(?:\.\d{1,2})?$/);

  return match ? Number(amount).toFixed(2) : null;
}

function normalizeTxnTime(rawTime: string) {
  const normalized = rawTime.replace(/\//g, "-");
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }

  return normalized;
}

function shouldSkipRawRow(row: string[]) {
  if (!row.some(Boolean)) {
    return true;
  }

  const firstCell = row[0] ?? "";
  return /^(合计|总计|收入|支出)/.test(firstCell);
}

function validateRow(raw: Record<string, string>, options: ExpenseImportParserOptions): ParsedExpenseImportRow | string {
  const txnTime = normalizeTxnTime(readRequired(raw, "交易时间"));
  if (!txnTime) {
    return "交易时间格式不正确。";
  }

  const direction = normalizeDirection(readRequired(raw, "收/支"));
  if (!direction) {
    return "收/支必须是收入、支出或不计收支。";
  }

  const amount = normalizeAmount(readRequired(raw, options.amountHeader));
  if (!amount) {
    return "金额格式不正确。";
  }

  const txnNo = readRequired(raw, options.txnNoHeader);
  if (!txnNo) {
    return `${options.txnNoHeader}不能为空。`;
  }

  return {
    txnTime,
    sourceCategory: readRequired(raw, options.categoryHeader) || null,
    merchant: readRequired(raw, options.merchantHeader) || null,
    item: readRequired(raw, options.itemHeader) || null,
    direction,
    amount,
    payMethod: readRequired(raw, options.payMethodHeader) || null,
    txnNo,
    raw,
  };
}

export function parseExpenseCsv(buffer: Buffer, options: ExpenseImportParserOptions): ParsedExpenseImportFile {
  const decoded = decodeExpenseCsv(buffer);
  const rows = readSheetRows(decoded.text).map((row) => row.map(cleanText));
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);

  if (rows.length > EXPENSE_IMPORT_MAX_ROWS) {
    return importLimitError(options, decoded.encoding, `导入文件不能超过 ${EXPENSE_IMPORT_MAX_ROWS} 行，请拆分后再导入。`);
  }

  if (maxColumns > EXPENSE_IMPORT_MAX_COLUMNS) {
    return importLimitError(options, decoded.encoding, `导入文件不能超过 ${EXPENSE_IMPORT_MAX_COLUMNS} 列，请删减后再导入。`);
  }

  const headerIndex = findHeaderIndex(rows);
  const parsedRows: ParsedExpenseImportRow[] = [];
  const filteredRows: FilteredExpenseImportRow[] = [];
  const errors: ParsedExpenseImportFile["errors"] = [];

  if (headerIndex < 0) {
    return {
      platform: options.platform,
      encoding: decoded.encoding,
      rows: [],
      filteredRows: [],
      errors: [{ rowNumber: 0, txnNo: null, message: "没有找到包含交易时间的表头行。", raw: {} }],
    };
  }

  // 保留完整表头行（含空单元格），交由 rowToObject 按原始下标对齐并跳过空表头。
  const headers = rows[headerIndex];
  for (const [index, row] of rows.slice(headerIndex + 1).entries()) {
    const rowNumber = headerIndex + index + 2;

    if (shouldSkipRawRow(row)) {
      continue;
    }

    const raw = rowToObject(headers, row);
    const txnNo = readRequired(raw, options.txnNoHeader) || null;
    const status = readRequired(raw, options.statusHeader);

    if (filteredStatuses.has(status)) {
      filteredRows.push({ rowNumber, txnNo, reason: status, raw });
      continue;
    }

    const result = validateRow(raw, options);
    if (typeof result === "string") {
      errors.push({ rowNumber, txnNo, message: result, raw });
      continue;
    }

    parsedRows.push(result);
  }

  return {
    platform: options.platform,
    encoding: decoded.encoding,
    rows: parsedRows,
    filteredRows,
    errors,
  };
}
