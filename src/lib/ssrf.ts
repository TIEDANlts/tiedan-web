import { isIP } from "node:net";

/**
 * SSRF 防护：阻止服务端出站请求访问内网 / 保留地址。
 *
 * 两道防线：
 *  1. assertSafeOutboundUrl —— 在发起请求前对 URL 做协议与字面量地址校验（快速失败）。
 *  2. createGuardedLookup  —— 作为 undici Agent 的 DNS lookup，在「连接时」校验真实解析到的 IP，
 *     从而同时防住 DNS 重绑定（rebinding）和「先返回公网域名、再 302 跳到内网」的绕过。
 */
export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** 通过环境变量显式放行内网出站（例如需要拉取局域网内的自建图床时）。 */
export function isOutboundGuardDisabled() {
  return process.env.SSRF_ALLOW_PRIVATE === "1" || process.env.SSRF_ALLOW_PRIVATE === "true";
}

function ipv4ToLong(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return null;
  }

  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }
    const octet = Number(part);
    if (octet > 255) {
      return null;
    }
    value = value * 256 + octet;
  }

  return value >>> 0;
}

function ipv4InCidr(long: number, base: string, bits: number) {
  const baseLong = ipv4ToLong(base);
  if (baseLong === null) {
    return false;
  }
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (long & mask) === (baseLong & mask);
}

function isPrivateIpv4(ip: string): boolean {
  const long = ipv4ToLong(ip);
  if (long === null) {
    return false;
  }

  return (
    ipv4InCidr(long, "0.0.0.0", 8) || // 本网络 / 未指定
    ipv4InCidr(long, "10.0.0.0", 8) || // 私有
    ipv4InCidr(long, "100.64.0.0", 10) || // 运营商级 NAT
    ipv4InCidr(long, "127.0.0.0", 8) || // 回环
    ipv4InCidr(long, "169.254.0.0", 16) || // 链路本地（含云元数据 169.254.169.254）
    ipv4InCidr(long, "172.16.0.0", 12) || // 私有
    ipv4InCidr(long, "192.0.0.0", 24) || // IETF 协议分配
    ipv4InCidr(long, "192.168.0.0", 16) || // 私有
    ipv4InCidr(long, "198.18.0.0", 15) || // 基准测试
    ipv4InCidr(long, "224.0.0.0", 4) || // 组播
    ipv4InCidr(long, "240.0.0.0", 4) // 保留 / 广播
  );
}

function isPrivateIpv6(ip: string): boolean {
  // 去掉 IPv6 zone id（如 fe80::1%eth0）。
  const normalized = ip.toLowerCase().split("%")[0];

  // IPv4-mapped 文本形式 ::ffff:1.2.3.4，按内嵌的 IPv4 判定。
  const mapped = normalized.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) {
    return isPrivateIpv4(mapped[1]);
  }

  if (normalized === "::1" || normalized === "::") {
    return true; // 回环 / 未指定
  }

  // fe80::/10 链路本地：第二个 hextet 首字符为 8/9/a/b。
  if (/^fe[89ab]/.test(normalized)) {
    return true;
  }

  // fc00::/7 唯一本地地址（fc.. / fd..）。
  if (/^f[cd]/.test(normalized)) {
    return true;
  }

  return false;
}

/** 判断一个 IP 字面量是否属于内网 / 保留地址。非合法 IP 一律返回 false（由 DNS 解析阶段再判定）。 */
export function isPrivateOrReservedIp(address: string): boolean {
  const ip = address.trim().replace(/^\[|\]$/g, "");
  const family = isIP(ip);

  if (family === 4) {
    return isPrivateIpv4(ip);
  }
  if (family === 6) {
    return isPrivateIpv6(ip);
  }

  return false;
}

/**
 * 发起出站请求前的 URL 校验：只允许 http(s)，并拒绝指向 localhost / 字面量内网 IP 的目标。
 * 主机名形式的目标在此放行，留待连接时由 createGuardedLookup 校验真实解析 IP。
 */
export function assertSafeOutboundUrl(input: string | URL): URL {
  if (isOutboundGuardDisabled()) {
    return new URL(input.toString());
  }

  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new SsrfError("请求地址无效。");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new SsrfError(`不支持的协议：${url.protocol}`);
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new SsrfError("禁止访问本机地址。");
  }

  if (isIP(host) && isPrivateOrReservedIp(host)) {
    throw new SsrfError(`禁止访问内网地址：${host}`);
  }

  return url;
}

type LookupAddress = { address: string; family: number };
type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;
type LookupOptions = { all?: boolean; family?: number; hints?: number };
type LookupFn = (hostname: string, options: LookupOptions, callback: LookupCallback) => void;

/**
 * 包装 dns.lookup，供 undici Agent 的 connect.lookup 使用。
 * 校验「实际将要连接的 IP」，因此每一次（含每个重定向跳转的）连接都会被检查。
 */
export function createGuardedLookup(baseLookup: LookupFn): LookupFn {
  return (hostname, options, callback) => {
    if (isOutboundGuardDisabled()) {
      baseLookup(hostname, options, callback);
      return;
    }

    baseLookup(hostname, options, (err, address, family) => {
      if (err) {
        callback(err, address, family);
        return;
      }

      const addresses: LookupAddress[] = Array.isArray(address)
        ? address
        : [{ address: address as string, family: family ?? 0 }];

      const blocked = addresses.find((entry) => isPrivateOrReservedIp(entry.address));
      if (blocked) {
        callback(new SsrfError(`禁止访问内网地址：${blocked.address}（${hostname}）`), [], 0);
        return;
      }

      callback(null, address, family);
    });
  };
}
