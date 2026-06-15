import { decodeExpenseCsv } from "./common";
import { parseAlipayExpenseFile } from "./alipay";
import { parseWechatExpenseFile } from "./wechat";
import type { ExpenseImportEncoding, ExpenseImportPlatform } from "./types";

export type {
  ExpenseImportEncoding,
  ExpenseImportError,
  ExpenseImportPlatform,
  FilteredExpenseImportRow,
  ParsedExpenseImportFile,
  ParsedExpenseImportRow,
} from "./types";

export function detectExpenseImportPlatform(buffer: Buffer): {
  platform: ExpenseImportPlatform | null;
  encoding: ExpenseImportEncoding;
} {
  const decoded = decodeExpenseCsv(buffer);
  const head = decoded.text.slice(0, 4096);

  if (head.includes("交易订单号") || head.includes("支付宝")) {
    return { platform: "alipay", encoding: decoded.encoding };
  }

  if (head.includes("交易单号") || head.includes("微信支付")) {
    return { platform: "wechat", encoding: decoded.encoding };
  }

  return { platform: null, encoding: decoded.encoding };
}

export function parseExpenseImportFile(buffer: Buffer, platform: ExpenseImportPlatform) {
  return platform === "alipay" ? parseAlipayExpenseFile(buffer) : parseWechatExpenseFile(buffer);
}
