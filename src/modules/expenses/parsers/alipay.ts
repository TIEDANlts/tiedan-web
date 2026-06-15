import { parseExpenseCsv } from "./common";

export function parseAlipayExpenseFile(buffer: Buffer) {
  return parseExpenseCsv(buffer, {
    platform: "alipay",
    categoryHeader: "交易分类",
    merchantHeader: "交易对方",
    itemHeader: "商品说明",
    amountHeader: "金额",
    payMethodHeader: "收/付款方式",
    statusHeader: "交易状态",
    txnNoHeader: "交易订单号",
  });
}
