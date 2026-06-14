import { fetch as undiciFetch, ProxyAgent, type Dispatcher } from "undici";
import type { RequestInit as UndiciRequestInit } from "undici/types/fetch";

export type OutboundFetchOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 1;

let cachedProxyUrl: string | null = null;
let cachedDispatcher: Dispatcher | undefined;

function proxyDispatcher() {
  const proxyUrl = process.env.OUTBOUND_PROXY?.trim() || null;

  if (!proxyUrl) {
    cachedProxyUrl = null;
    cachedDispatcher = undefined;
    return undefined;
  }

  if (cachedProxyUrl !== proxyUrl) {
    cachedProxyUrl = proxyUrl;
    cachedDispatcher = new ProxyAgent(proxyUrl);
  }

  return cachedDispatcher;
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

export async function fetchWithRetry(url: string | URL, options: OutboundFetchOptions = {}) {
  const { retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const attempts = Math.max(1, retries + 1);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const timeout = timeoutSignal(fetchOptions.signal, timeoutMs);

    try {
      const dispatcher = proxyDispatcher();
      const response = dispatcher
        ? ((await undiciFetch(url, {
            ...fetchOptions,
            dispatcher,
            signal: timeout.signal,
          } as UndiciRequestInit)) as unknown as Response)
        : await fetch(url, {
            ...fetchOptions,
            signal: timeout.signal,
          });

      if (attempt < attempts && shouldRetry(null, response)) {
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetry(error)) {
        throw error;
      }
    } finally {
      timeout.clear();
    }
  }

  throw lastError;
}
