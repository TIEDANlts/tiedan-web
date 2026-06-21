import fs from "node:fs";
import path from "node:path";
import type { TestInfo } from "@playwright/test";

export function uniquePrefix(testInfo: TestInfo) {
  const worker = `w${testInfo.workerIndex}`;
  const project = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-");
  return `E2E-${project}-${worker}-${Date.now()}`;
}

export function writeExpenseCsv(testInfo: TestInfo, prefix: string) {
  const filePath = testInfo.outputPath(`${prefix}-wechat.csv`);
  const safeId = prefix.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  fs.writeFileSync(
    filePath,
    [
      "交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号",
      `2026-06-20 10:15:00,餐饮,${prefix} CSV 咖啡,拿铁,支出,18.50,零钱,支付成功,${safeId}-wechat-001`,
      `2026-06-20 11:25:00,餐饮,${prefix} CSV 早餐,三明治,支出,12.00,零钱,支付成功,${safeId}-wechat-002`,
    ].join("\n"),
    "utf8",
  );
  return filePath;
}

export function writeMediaCsv(testInfo: TestInfo, prefix: string) {
  const filePath = testInfo.outputPath(`${prefix}-media.csv`);
  const safeId = prefix.toLowerCase().replace(/[^a-z0-9]+/g, "");
  fs.writeFileSync(
    filePath,
    [
      "书影音名,类型,我的评分,短评,标记日期,豆瓣链接,年份,状态",
      `${prefix} CSV 媒体,图书,4星,导入短评,2026-06-20,https://book.douban.com/subject/9${safeId.slice(-7).padStart(7, "0")}/,2026,读过`,
    ].join("\n"),
    "utf8",
  );
  return filePath;
}

export function writeTinyPng(testInfo: TestInfo, filename = "tiny.png") {
  const filePath = testInfo.outputPath(filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  return filePath;
}
