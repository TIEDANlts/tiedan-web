import { fetchWithRetry, type OutboundFetchOptions } from "../../lib/http";

export type NominatimResult = {
  name: string;
  lat: number;
  lng: number;
};

type NominatimRaw = {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
};

export class NominatimRateLimiter {
  private lastAt = 0;

  tryAcquire(now = Date.now()) {
    if (now - this.lastAt < 1_000) {
      return false;
    }

    this.lastAt = now;
    return true;
  }
}

type SearcherOptions = {
  fetcher?: (url: string, options?: OutboundFetchOptions) => Promise<Response>;
  now?: () => number;
  limiter?: NominatimRateLimiter;
};

export function createNominatimSearcher(options: SearcherOptions = {}) {
  const fetcher = options.fetcher ?? fetchWithRetry;
  const now = options.now ?? Date.now;
  const limiter = options.limiter ?? new NominatimRateLimiter();

  return async function searchNominatim(query: string): Promise<NominatimResult[]> {
    const keyword = query.trim();
    if (!keyword) {
      return [];
    }

    if (!limiter.tryAcquire(now())) {
      throw new Error("搜索太频繁，请稍后再试。");
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "6");
    url.searchParams.set("q", keyword);

    const response = await fetcher(url.toString(), {
      headers: {
        accept: "application/json",
        "user-agent": "TIEDAN Personal Website/1.0 (single-user trip planner)",
      },
    });

    if (!response.ok) {
      throw new Error("地点搜索暂时不可用。");
    }

    const rows = (await response.json()) as NominatimRaw[];
    return rows.flatMap((row) => {
      const name = row.display_name || row.name || "";
      const lat = Number(row.lat);
      const lng = Number(row.lon);

      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return [];
      }

      return [{ name, lat, lng }];
    });
  };
}

export const searchNominatim = createNominatimSearcher();
