import type { TxnDirectionValue } from "../utils";

export type ExpenseImportPlatform = "alipay" | "wechat";
export type ExpenseImportEncoding = "utf8" | "gbk";

export type ParsedExpenseImportRow = {
  txnTime: string;
  amount: string;
  direction: TxnDirectionValue;
  merchant: string | null;
  item: string | null;
  payMethod: string | null;
  txnNo: string;
  sourceCategory: string | null;
  raw: Record<string, string>;
};

export type FilteredExpenseImportRow = {
  rowNumber: number;
  txnNo: string | null;
  reason: string;
  raw: Record<string, string>;
};

export type ExpenseImportError = {
  rowNumber: number;
  txnNo: string | null;
  message: string;
  raw: Record<string, string>;
};

export type ParsedExpenseImportFile = {
  platform: ExpenseImportPlatform;
  encoding: ExpenseImportEncoding;
  rows: ParsedExpenseImportRow[];
  filteredRows: FilteredExpenseImportRow[];
  errors: ExpenseImportError[];
};

export type ExpenseImportParserOptions = {
  platform: ExpenseImportPlatform;
  categoryHeader: string;
  merchantHeader: string;
  itemHeader: string;
  amountHeader: string;
  payMethodHeader: string;
  statusHeader: string;
  txnNoHeader: string;
};
