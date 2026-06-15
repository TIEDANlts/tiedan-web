import { createHash, timingSafeEqual } from "node:crypto";

/**
 * 常量时间比较两个密钥/令牌字符串。
 *
 * 直接用 `a === b` 比较会在第一个不同字符处短路返回，理论上可被时序攻击逐字符还原令牌。
 * 这里先各自做 SHA-256 摘要再用 `timingSafeEqual` 比较定长 buffer：
 * 既保证比较耗时与输入内容无关，也不会因长度不同而泄露原始长度。
 */
export function secureTokenEqual(a: string, b: string): boolean {
  const hashedA = createHash("sha256").update(a, "utf8").digest();
  const hashedB = createHash("sha256").update(b, "utf8").digest();

  return timingSafeEqual(hashedA, hashedB);
}

/**
 * 从 Authorization 头中提取 Bearer 令牌；缺失或格式不符时返回空字符串。
 */
export function extractBearerToken(authorization: string | null | undefined): string {
  if (!authorization?.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}
