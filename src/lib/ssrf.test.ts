import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertSafeOutboundUrl,
  createGuardedLookup,
  isPrivateOrReservedIp,
  SsrfError,
} from "./ssrf";

afterEach(() => {
  delete process.env.SSRF_ALLOW_PRIVATE;
});

describe("isPrivateOrReservedIp", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // 云元数据
    "100.64.0.1", // CGNAT
    "0.0.0.0",
    "::1",
    "::",
    "fe80::1",
    "fc00::1",
    "fd12:3456::1",
    "::ffff:127.0.0.1", // IPv4-mapped
    "[::1]", // 带方括号
  ])("flags private/reserved %s", (ip) => {
    expect(isPrivateOrReservedIp(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "172.32.0.1", // 紧邻 172.16/12 之外
    "192.169.0.1",
    "100.128.0.1", // 100.64/10 之外
    "::ffff:8.8.8.8",
    "2606:4700:4700::1111",
    "example.com", // 非 IP
    "",
  ])("allows public %s", (ip) => {
    expect(isPrivateOrReservedIp(ip)).toBe(false);
  });
});

describe("assertSafeOutboundUrl", () => {
  it.each(["https://example.com/cover.jpg", "http://8.8.8.8/ok"])("allows %s", (url) => {
    expect(assertSafeOutboundUrl(url).href).toContain(new URL(url).hostname);
  });

  it.each([
    "ftp://example.com/x",
    "file:///etc/passwd",
    "http://localhost/admin",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://192.168.0.10/internal",
    "not-a-url",
  ])("rejects %s", (url) => {
    expect(() => assertSafeOutboundUrl(url)).toThrow(SsrfError);
  });

  it("can be disabled via SSRF_ALLOW_PRIVATE", () => {
    process.env.SSRF_ALLOW_PRIVATE = "1";
    expect(assertSafeOutboundUrl("http://127.0.0.1/").hostname).toBe("127.0.0.1");
  });
});

describe("createGuardedLookup", () => {
  function fakeLookup(result: string | { address: string; family: number }[]) {
    return vi.fn((_hostname: string, _options: unknown, cb: (...args: unknown[]) => void) => {
      if (Array.isArray(result)) {
        cb(null, result);
      } else {
        cb(null, result, result.includes(":") ? 6 : 4);
      }
    });
  }

  it("blocks when the host resolves to a private IP (single address form)", () => {
    const guarded = createGuardedLookup(fakeLookup("127.0.0.1") as never);
    const cb = vi.fn();
    guarded("evil.test", {}, cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(SsrfError);
  });

  it("blocks when any resolved address (array form) is private", () => {
    const guarded = createGuardedLookup(
      fakeLookup([
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.5", family: 4 },
      ]) as never,
    );
    const cb = vi.fn();
    guarded("rebind.test", { all: true }, cb);

    expect(cb.mock.calls[0][0]).toBeInstanceOf(SsrfError);
  });

  it("passes through public resolutions unchanged", () => {
    const guarded = createGuardedLookup(fakeLookup("93.184.216.34") as never);
    const cb = vi.fn();
    guarded("example.com", {}, cb);

    expect(cb).toHaveBeenCalledWith(null, "93.184.216.34", 4);
  });

  it("propagates underlying DNS errors", () => {
    const dnsError = Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
    const base = vi.fn((_h: string, _o: unknown, cb: (...args: unknown[]) => void) => cb(dnsError));
    const guarded = createGuardedLookup(base as never);
    const cb = vi.fn();
    guarded("missing.test", {}, cb);

    expect(cb.mock.calls[0][0]).toBe(dnsError);
  });
});
