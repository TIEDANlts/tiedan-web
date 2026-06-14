import { describe, expect, it } from "vitest";

import { mergeSteamLibrary, type SteamLibraryItem } from "./steam";

type FakeGame = {
  id: string;
  source: string;
  steamAppId: number | null;
  name: string;
  platform: string;
  coverUrl: string | null;
  status: "WISHLIST" | "BACKLOG" | "PLAYING" | "FINISHED" | "SHELVED";
  rating: number | null;
  playtimeMin: number;
  playtime2w: number;
  lastPlayedAt: Date | null;
  reviewMd: string | null;
  tags: string[];
};

function createFakeSteamSyncClient(initialGames: FakeGame[]) {
  const games = initialGames.map((game) => ({ ...game, tags: [...game.tags] }));

  return {
    games,
    game: {
      async findUnique(args: { where: { steamAppId: number } }) {
        const game = games.find((item) => item.steamAppId === args.where.steamAppId);
        return game ? { id: game.id, status: game.status } : null;
      },
      async create(args: { data: Omit<FakeGame, "id" | "rating" | "reviewMd"> }) {
        const game: FakeGame = {
          id: `created-${args.data.steamAppId}`,
          rating: null,
          reviewMd: null,
          ...args.data,
        };
        games.push(game);
        return game;
      },
      async update(args: { where: { id: string }; data: Partial<FakeGame> }) {
        const game = games.find((item) => item.id === args.where.id);
        if (!game) {
          throw new Error(`Missing fake game ${args.where.id}`);
        }
        Object.assign(game, args.data);
        return game;
      },
    },
  };
}

describe("mergeSteamLibrary", () => {
  it("updates Steam objective fields without overwriting subjective user fields", async () => {
    const playedAt = new Date("2026-06-14T08:00:00.000Z");
    const finishedAt = new Date("2026-01-01T08:00:00.000Z");
    const backlogAt = new Date("2026-02-01T08:00:00.000Z");
    const client = createFakeSteamSyncClient([
      {
        id: "finished",
        source: "manual",
        steamAppId: 10,
        name: "旧名字",
        platform: "Steam",
        coverUrl: "https://old.example/cover.jpg",
        status: "FINISHED",
        rating: 9,
        playtimeMin: 30,
        playtime2w: 0,
        lastPlayedAt: finishedAt,
        reviewMd: "我自己写的感想",
        tags: ["剧情", "手动标签"],
      },
      {
        id: "backlog",
        source: "steam",
        steamAppId: 20,
        name: "旧库存",
        platform: "Steam",
        coverUrl: null,
        status: "BACKLOG",
        rating: 8,
        playtimeMin: 0,
        playtime2w: 0,
        lastPlayedAt: backlogAt,
        reviewMd: "库存备注",
        tags: ["独立游戏"],
      },
    ]);

    const steamGames: SteamLibraryItem[] = [
      {
        steamAppId: 10,
        name: "Steam 新名字",
        coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/10/header.jpg",
        playtimeMin: 120,
        playtime2w: 60,
        lastPlayedAt: playedAt,
      },
      {
        steamAppId: 20,
        name: "最近打开的库存",
        coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/20/header.jpg",
        playtimeMin: 45,
        playtime2w: 45,
        lastPlayedAt: playedAt,
      },
      {
        steamAppId: 30,
        name: "新同步游戏",
        coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/30/header.jpg",
        playtimeMin: 0,
        playtime2w: 0,
        lastPlayedAt: null,
      },
    ];

    await expect(mergeSteamLibrary(client, steamGames)).resolves.toEqual({ added: 1, updated: 2 });

    expect(client.games.find((game) => game.id === "finished")).toMatchObject({
      source: "manual",
      name: "Steam 新名字",
      coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/10/header.jpg",
      status: "FINISHED",
      rating: 9,
      playtimeMin: 120,
      playtime2w: 60,
      lastPlayedAt: playedAt,
      reviewMd: "我自己写的感想",
      tags: ["剧情", "手动标签"],
    });

    expect(client.games.find((game) => game.id === "backlog")).toMatchObject({
      name: "最近打开的库存",
      status: "PLAYING",
      rating: 8,
      playtimeMin: 45,
      playtime2w: 45,
      lastPlayedAt: playedAt,
      reviewMd: "库存备注",
      tags: ["独立游戏"],
    });

    expect(client.games.find((game) => game.steamAppId === 30)).toMatchObject({
      source: "steam",
      name: "新同步游戏",
      platform: "Steam",
      status: "BACKLOG",
      rating: null,
      reviewMd: null,
      tags: [],
      playtimeMin: 0,
      playtime2w: 0,
      lastPlayedAt: null,
    });
  });
});
