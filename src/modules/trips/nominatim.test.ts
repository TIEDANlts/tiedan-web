import { afterEach, describe, expect, it, vi } from "vitest";

import { createNominatimSearcher, NominatimRateLimiter } from "./nominatim";

describe("NominatimRateLimiter", () => {
  it("allows one request per second", () => {
    const limiter = new NominatimRateLimiter();

    expect(limiter.tryAcquire(1_000)).toBe(true);
    expect(limiter.tryAcquire(1_500)).toBe(false);
    expect(limiter.tryAcquire(2_001)).toBe(true);
  });
});

describe("createNominatimSearcher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps Nominatim results to name and WGS-84 coordinates", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            display_name: "West Lake, Hangzhou",
            lat: "30.243",
            lon: "120.15",
          },
        ]),
      ),
    );
    const searcher = createNominatimSearcher({ fetcher, now: () => 1_000 });

    const result = await searcher("西湖");

    expect(result).toEqual([{ name: "West Lake, Hangzhou", lat: 30.243, lng: 120.15 }]);
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("nominatim.openstreetmap.org"), expect.objectContaining({
      headers: expect.objectContaining({ "user-agent": expect.stringContaining("TIEDAN") }),
    }));
  });

  it("rejects requests above one per second", async () => {
    const fetcher = vi.fn();
    const searcher = createNominatimSearcher({ fetcher, now: () => 1_000 });

    await expect(searcher("a")).rejects.toThrow();
    await expect(searcher("b")).rejects.toThrow("搜索太频繁");
  });
});
