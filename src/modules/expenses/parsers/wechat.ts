import { parseExpenseCsv } from "./common";

export function parseWechatExpenseFile(buffer: Buffer) {
  return parseExpenseCsv(buffer, {
    platform: "wechat",
    categoryHeader: "交易类型",
    merchantHeader: "交易对方",
    itemHeader: "商品",
    amountHeader: "金额(元)",
    payMethodHeader: "支付方式",
    statusHeader: "当前状态",
    txnNoHeader: "交易单号",
  });
}
