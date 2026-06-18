import { afterEach, describe, expect, it } from "vitest";

import { fetchWithRetry, OutboundFetchError } from "./http";
import { SsrfError } from "./ssrf";

afterEach(() => {
  delete process.env.SSRF_ALLOW_PRIVATE;
});

describe("fetchWithRetry SSRF guard", () => {
  it.each([
    "http://127.0.0.1:9/",
    "http://169.254.169.254/latest/meta-data/", // 云元数据端点
    "http://[::1]:9/",
    "http://192.168.0.1/",
    "http://10.0.0.1/",
    "ftp://example.com/resource",
    "file:///etc/passwd",
  ])("rejects internal/disallowed target %s with a stable SSRF code", async (url) => {
    await expect(fetchWithRetry(url, { retries: 0, timeoutMs: 1000 })).rejects.toBeInstanceOf(OutboundFetchError);
    await expect(fetchWithRetry(url, { retries: 0, timeoutMs: 1000 })).rejects.toMatchObject({
      code: "SSRF_BLOCKED",
      cause: expect.any(SsrfError),
    });
  });

  it("does not raise SsrfError for literal private IPs when escape hatch is enabled", async () => {
    process.env.SSRF_ALLOW_PRIVATE = "1";
    // 放行后不再是 SsrfError；连接本身大概率失败（端口未监听），但错误类型不应是 SsrfError。
    await expect(
      fetchWithRetry("http://127.0.0.1:9/", { retries: 0, timeoutMs: 1000 }),
    ).rejects.not.toBeInstanceOf(SsrfError);
  });

  it("wraps SSRF failures in a stable outbound fetch error code", async () => {
    await expect(fetchWithRetry("http://127.0.0.1:9/", { retries: 0, timeoutMs: 1000 })).rejects.toBeInstanceOf(
      OutboundFetchError,
    );
    await expect(fetchWithRetry("http://127.0.0.1:9/", { retries: 0, timeoutMs: 1000 })).rejects.toMatchObject({
      code: "SSRF_BLOCKED",
    });
  });
});
