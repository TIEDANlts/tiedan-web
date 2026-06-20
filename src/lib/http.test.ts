import { afterEach, describe, expect, it } from "vitest";

import { fetchWithRetry, OutboundFetchError } from "./http";
import { SsrfError } from "./ssrf";

afterEach(() => {
  delete process.env.SSRF_ALLOW_PRIVATE;
  delete process.env.OUTBOUND_PROXY;
  delete process.env.OUTBOUND_PROXY_TRUSTS_PRIVATE_GUARD;
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

  it("rejects OUTBOUND_PROXY unless the private guard bypass is explicitly trusted", async () => {
    process.env.OUTBOUND_PROXY = "http://proxy.example:8080";

    await expect(fetchWithRetry("https://example.com/", { retries: 0, timeoutMs: 1000 })).rejects.toMatchObject({
      code: "SSRF_BLOCKED",
    });
  });

  it("keeps literal private URL checks when OUTBOUND_PROXY is explicitly trusted", async () => {
    process.env.OUTBOUND_PROXY = "http://proxy.example:8080";
    process.env.OUTBOUND_PROXY_TRUSTS_PRIVATE_GUARD = "1";

    await expect(fetchWithRetry("http://169.254.169.254/latest/meta-data/", { retries: 0, timeoutMs: 1000 })).rejects
      .toMatchObject({
        code: "SSRF_BLOCKED",
        cause: expect.any(SsrfError),
      });
  });

  it("does not reuse a stale proxy dispatcher after ProxyAgent rejects a new proxy URL", async () => {
    process.env.OUTBOUND_PROXY = "http://127.0.0.1:9";
    process.env.OUTBOUND_PROXY_TRUSTS_PRIVATE_GUARD = "1";

    await expect(fetchWithRetry("https://example.com/", { retries: 0, timeoutMs: 1000 })).rejects.toMatchObject({
      code: "DOWNLOAD_FAILED",
    });

    process.env.OUTBOUND_PROXY = "not-a-url";

    await expect(fetchWithRetry("https://example.com/", { retries: 0, timeoutMs: 1000 })).rejects.toMatchObject({
      code: "DOWNLOAD_FAILED",
      cause: expect.objectContaining({ message: "Invalid URL" }),
    });
    await expect(fetchWithRetry("https://example.com/", { retries: 0, timeoutMs: 1000 })).rejects.toMatchObject({
      code: "DOWNLOAD_FAILED",
      cause: expect.objectContaining({ message: "Invalid URL" }),
    });
  });
});
