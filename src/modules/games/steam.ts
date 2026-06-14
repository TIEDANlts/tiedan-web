import { fetchWithRetry } from "../../lib/http";

export const STEAM_LAST_SYNC_SETTING_KEY = "steam.lastSyncAt";

const STEAM_OWNED_GAMES_URL = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/";

type GameStatusValue = "WISHLIST" | "BACKLOG" | "PLAYING" | "FINISHED" | "SHELVED";

type RawSteamGame = {
  appid?: unknown;
  name?: unknown;
  playtime_forever?: unknown;
  playtime_2weeks?: unknown;
  rtime_last_played?: unknown;
};

type SteamOwnedGamesResponse = {
  response?: {
    games?: RawSteamGame[];
  };
};

export type SteamLibraryItem = {
  steamAppId: number;
  name: string;
  coverUrl: string;
  playtimeMin: number;
  playtime2w: number;
  lastPlayedAt: Date | null;
};

export type SteamSyncResult = {
  added: number;
  updated: number;
};

type SteamGameCreateData = {
  source: "steam";
  steamAppId: number;
  name: string;
  platform: "Steam";
  coverUrl: string;
  status: "BACKLOG";
  playtimeMin: number;
  playtime2w: number;
  lastPlayedAt: Date | null;
  tags: string[];
};

type SteamGameUpdateData = {
  name: string;
  coverUrl: string;
  playtimeMin: number;
  playtime2w: number;
  lastPlayedAt: Date | null;
  status?: "PLAYING";
};

export type SteamMergeClient = {
  game: {
    findUnique(args: {
      where: { steamAppId: number };
      select?: { id: true; status: true };
    }): Promise<{ id: string; status: GameStatusValue } | null>;
    create(args: { data: SteamGameCreateData }): Promise<unknown>;
    update(args: { where: { id: string }; data: SteamGameUpdateData }): Promise<unknown>;
  };
};

type SteamSyncDatabaseClient = SteamMergeClient & {
  setting: {
    upsert(args: {
      where: { key: string };
      create: { key: string; value: string };
      update: { value: string };
    }): Promise<unknown>;
  };
};

function requireSteamEnv() {
  const apiKey = process.env.STEAM_API_KEY?.trim();
  const steamId = process.env.STEAM_ID?.trim();

  if (!apiKey || !steamId) {
    throw new Error("缺少 STEAM_API_KEY 或 STEAM_ID，无法同步 Steam 游戏库。");
  }

  return { apiKey, steamId };
}

function steamCoverUrl(appid: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

function nonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function normalizeSteamGame(game: RawSteamGame): SteamLibraryItem | null {
  const appid = typeof game.appid === "number" && Number.isInteger(game.appid) && game.appid > 0 ? game.appid : null;

  if (!appid) {
    return null;
  }

  const lastPlayedSeconds = nonNegativeInteger(game.rtime_last_played);

  return {
    steamAppId: appid,
    name: typeof game.name === "string" && game.name.trim() ? game.name.trim() : `Steam App ${appid}`,
    coverUrl: steamCoverUrl(appid),
    playtimeMin: nonNegativeInteger(game.playtime_forever),
    playtime2w: nonNegativeInteger(game.playtime_2weeks),
    lastPlayedAt: lastPlayedSeconds > 0 ? new Date(lastPlayedSeconds * 1000) : null,
  };
}

export async function fetchSteamLibrary() {
  const { apiKey, steamId } = requireSteamEnv();
  const url = new URL(STEAM_OWNED_GAMES_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");

  const response = await fetchWithRetry(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Steam API 请求失败（HTTP ${response.status}）。`);
  }

  let payload: SteamOwnedGamesResponse;
  try {
    payload = (await response.json()) as SteamOwnedGamesResponse;
  } catch {
    throw new Error("Steam API 返回的 JSON 无法解析。");
  }

  const rawGames = payload.response?.games;
  if (!Array.isArray(rawGames)) {
    return [];
  }

  return rawGames.flatMap((game) => {
    const normalized = normalizeSteamGame(game);
    return normalized ? [normalized] : [];
  });
}

export async function mergeSteamLibrary(client: SteamMergeClient, steamGames: SteamLibraryItem[]): Promise<SteamSyncResult> {
  let added = 0;
  let updated = 0;
  const seenAppIds = new Set<number>();

  for (const game of steamGames) {
    if (seenAppIds.has(game.steamAppId)) {
      continue;
    }
    seenAppIds.add(game.steamAppId);

    const existing = await client.game.findUnique({
      where: { steamAppId: game.steamAppId },
      select: { id: true, status: true },
    });

    if (!existing) {
      await client.game.create({
        data: {
          source: "steam",
          steamAppId: game.steamAppId,
          name: game.name,
          platform: "Steam",
          coverUrl: game.coverUrl,
          status: "BACKLOG",
          playtimeMin: game.playtimeMin,
          playtime2w: game.playtime2w,
          lastPlayedAt: game.lastPlayedAt,
          tags: [],
        },
      });
      added += 1;
      continue;
    }

    const data: SteamGameUpdateData = {
      name: game.name,
      coverUrl: game.coverUrl,
      playtimeMin: game.playtimeMin,
      playtime2w: game.playtime2w,
      lastPlayedAt: game.lastPlayedAt,
    };

    if (game.playtime2w > 0 && existing.status === "BACKLOG") {
      data.status = "PLAYING";
    }

    await client.game.update({
      where: { id: existing.id },
      data,
    });
    updated += 1;
  }

  return { added, updated };
}

export async function syncSteamLibrary() {
  const steamGames = await fetchSteamLibrary();
  const { db } = await import("../../lib/db");

  return db.$transaction(async (tx) => {
    const result = await mergeSteamLibrary(tx as unknown as SteamSyncDatabaseClient, steamGames);
    const syncedAt = new Date().toISOString();

    await tx.setting.upsert({
      where: { key: STEAM_LAST_SYNC_SETTING_KEY },
      create: { key: STEAM_LAST_SYNC_SETTING_KEY, value: syncedAt },
      update: { value: syncedAt },
    });

    return result;
  });
}
