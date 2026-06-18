import { lookup as dnsLookup } from "node:dns";
import { Agent, fetch as undiciFetch, ProxyAgent, type Dispatcher } from "undici";
import type { RequestInit as UndiciRequestInit } from "undici/types/fetch";

import { assertSafeOutboundUrl, createGuardedLookup } from "./ssrf";
import { SsrfError } from "./ssrf";

export type OutboundFetchOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 1;

export type OutboundFetchErrorCode = "SSRF_BLOCKED" | "TIMEOUT" | "DOWNLOAD_FAILED";

export class OutboundFetchError extends Error {
  constructor(
    message: string,
    public readonly code: OutboundFetchErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "OutboundFetchError";
  }
}

let cachedProxyUrl: string | null = null;
let cachedProxyDispatcher: Dispatcher | undefined;
let cachedGuardedDispatcher: Agent | undefined;

// 无代理时使用的出站 Agent：在连接阶段用受控的 DNS lookup 校验真实 IP，
// 从而拦截解析到内网的域名、DNS 重绑定以及重定向到内网的目标。
function guardedDispatcher() {
  if (!cachedGuardedDispatcher) {
    cachedGuardedDispatcher = new Agent({
      connect: {
        // @ts-expect-error undici 的 connect.lookup 与 dns.lookup 签名一致，类型未导出。
        lookup: createGuardedLookup(dnsLookup),
      },
    });
  }

  return cachedGuardedDispatcher;
}

function outboundDispatcher(): Dispatcher {
  const proxyUrl = process.env.OUTBOUND_PROXY?.trim() || null;

  if (!proxyUrl) {
    cachedProxyUrl = null;
    cachedProxyDispatcher = undefined;
    return guardedDispatcher();
  }

  if (cachedProxyUrl !== proxyUrl) {
    cachedProxyUrl = proxyUrl;
    cachedProxyDispatcher = new ProxyAgent(proxyUrl);
  }

  return cachedProxyDispatcher as Dispatcher;
}

function timeoutSignal(signal: AbortSignal | null | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function shouldRetry(error: unknown, response?: Response) {
  if (error) {
    return true;
  }

  return response ? response.status >= 500 : false;
}

function toOutboundFetchError(error: unknown) {
  if (error instanceof OutboundFetchError) {
    return error;
  }

  if (error instanceof SsrfError) {
    return new OutboundFetchError(error.message, "SSRF_BLOCKED", error);
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new OutboundFetchError("请求超时。", "TIMEOUT", error);
  }

  return new OutboundFetchError(error instanceof Error ? error.message : "下载失败。", "DOWNLOAD_FAILED", error);
}

export async function fetchWithRetry(url: string | URL, options: OutboundFetchOptions = {}) {
  const { retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  // 发起请求前先做 URL 级 SSRF 校验（协议 + 字面量内网地址），快速失败。
  let safeUrl: URL;
  try {
    safeUrl = assertSafeOutboundUrl(url);
  } catch (error) {
    throw toOutboundFetchError(error);
  }

  const attempts = Math.max(1, retries + 1);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const timeout = timeoutSignal(fetchOptions.signal, timeoutMs);

    try {
      const response = (await undiciFetch(safeUrl, {
        ...fetchOptions,
        dispatcher: outboundDispatcher(),
        signal: timeout.signal,
      } as UndiciRequestInit)) as unknown as Response;

      if (attempt < attempts && shouldRetry(null, response)) {
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetry(error)) {
        throw toOutboundFetchError(error);
      }
    } finally {
      timeout.clear();
    }
  }

  throw lastError;
}
