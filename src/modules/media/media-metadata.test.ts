import { describe, expect, it, vi } from "vitest";

import { searchMediaMetadata, type MediaMetadataFetch } from "./metadata";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

describe("searchMediaMetadata", () => {
  it("searches books through NeoDB catalog search with a custom user agent", async () => {
    const fetcher = vi.fn<MediaMetadataFetch>().mockResolvedValue(
      jsonResponse({
        data: [
          {
            uuid: "book-1",
            category: "book",
            display_title: "活着",
            title: "活着",
            cover_image_url: "https://neodb.example/book.jpg",
            external_resources: [{ url: "https://book.douban.com/subject/4913064/" }],
            credits: [{ role: "author", name: "余华" }],
          },
        ],
        pages: 1,
        count: 1,
      }),
    );

    const result = await searchMediaMetadata({ type: "BOOK", query: "活着", fetcher });

    expect(fetcher).toHaveBeenCalledWith(
      "https://neodb.social/api/catalog/search?query=%E6%B4%BB%E7%9D%80&category=book&page=1",
      expect.objectContaining({
        headers: expect.objectContaining({
          "user-agent": expect.stringContaining("TIEDAN"),
        }),
      }),
    );
    expect(result).toMatchObject({
      source: "neodb",
      fallbackUsed: false,
      results: [
        {
          type: "BOOK",
          title: "活着",
          creator: "余华",
          doubanId: "4913064",
          coverUrl: "https://neodb.example/book.jpg",
        },
      ],
    });
  });

  it("falls back to NeoDB when TMDB movie search fails", async () => {
    const fetcher = vi
      .fn<MediaMetadataFetch>()
      .mockRejectedValueOnce(new Error("tmdb timeout"))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              uuid: "movie-1",
              category: "movie",
              display_title: "花样年华",
              title: "花样年华",
              cover_image_url: "https://neodb.example/movie.jpg",
              external_resources: [{ url: "https://movie.douban.com/subject/1291557/" }],
              credits: [{ role: "director", name: "王家卫" }],
            },
          ],
          pages: 1,
          count: 1,
        }),
      );

    const result = await searchMediaMetadata({ type: "MOVIE", query: "花样年华", fetcher, tmdbApiKey: "key" });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://api.themoviedb.org/3/search/movie?query=%E8%8A%B1%E6%A0%B7%E5%B9%B4%E5%8D%8E&language=zh-CN&page=1&api_key=key",
      expect.any(Object),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://neodb.social/api/catalog/search?query=%E8%8A%B1%E6%A0%B7%E5%B9%B4%E5%8D%8E&category=movie&page=1",
      expect.any(Object),
    );
    expect(result.source).toBe("neodb");
    expect(result.fallbackUsed).toBe(true);
    expect(result.message).toBe("TMDB 暂时不可用，已改用 NeoDB 搜索。");
    expect(result.results[0]).toMatchObject({
      type: "MOVIE",
      title: "花样年华",
      creator: "王家卫",
      doubanId: "1291557",
    });
  });

  it("maps successful TMDB tv results to media form fields", async () => {
    const fetcher = vi.fn<MediaMetadataFetch>().mockResolvedValue(
      jsonResponse({
        results: [
          {
            id: 95557,
            name: "漫长的季节",
            original_name: "漫长的季节",
            first_air_date: "2023-04-22",
            overview: "出租车司机王响...",
            poster_path: "/season.jpg",
          },
        ],
      }),
    );

    const result = await searchMediaMetadata({ type: "TV", query: "漫长的季节", fetcher, tmdbApiKey: "key" });

    expect(result).toMatchObject({
      source: "tmdb",
      fallbackUsed: false,
      results: [
        {
          type: "TV",
          title: "漫长的季节",
          originalTitle: "漫长的季节",
          tmdbId: "95557",
          year: 2023,
          releaseDate: "2023-04-22",
          coverUrl: "https://image.tmdb.org/t/p/w500/season.jpg",
        },
      ],
    });
  });
});
