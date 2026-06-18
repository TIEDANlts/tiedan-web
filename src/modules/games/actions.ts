"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { gameFinishedTitle, recordActivity, shouldRecordStatusTransition } from "@/lib/activity";
import { db } from "@/lib/db";
import { remoteImageErrorMessage, saveFromUrl } from "@/lib/storage";
import type { GameActionState, SteamSyncActionState } from "@/modules/games/action-state";
import {
  type GameStatusValue,
  nextGameStatus,
  readGameFormData,
} from "@/modules/games/utils";
import { syncSteamLibrary } from "@/modules/games/steam";

async function requireGameSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理游戏。");
  }
}

function isSteamCdnCover(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "cdn.cloudflare.steamstatic.com" && parsed.pathname.startsWith("/steam/apps/");
  } catch {
    return false;
  }
}

async function localizeCoverUrl(coverUrl: string | null) {
  if (!coverUrl || coverUrl.startsWith("/uploads/") || isSteamCdnCover(coverUrl)) {
    return coverUrl;
  }

  const saved = await saveFromUrl(coverUrl, "games");
  return saved.url;
}

function finishedWithoutRatingWarning(status: GameStatusValue, rating: number | null) {
  return status === "FINISHED" && rating === null ? "已标记为通关。可以稍后补一颗星，方便以后筛选回顾。" : undefined;
}

function revalidateGames() {
  revalidatePath("/games");
  revalidatePath("/");
}

export async function createGameAction(
  _previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  await requireGameSession();

  const input = readGameFormData(formData);
  if (!input.ok) {
    return { ok: false, message: "请检查游戏信息。", errors: input.errors };
  }

  let coverUrl: string | null;
  try {
    coverUrl = await localizeCoverUrl(input.data.coverUrl);
  } catch (error) {
    return {
      ok: false,
      message: "封面保存失败。",
      errors: { coverUrl: remoteImageErrorMessage(error, "远程封面无法转存。可以改用本地上传，或使用 Steam CDN 封面链接。") },
    };
  }

  const game = await db.game.create({
    data: {
      ...input.data,
      coverUrl,
      source: "manual",
    },
  });

  revalidateGames();

  return {
    ok: true,
    gameId: game.id,
    message: "游戏已加入收藏册。",
    warning: finishedWithoutRatingWarning(input.data.status, input.data.rating),
  };
}

export async function updateGameAction(
  _previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  await requireGameSession();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { ok: false, message: "缺少要编辑的游戏。", errors: { form: "游戏不存在。" } };
  }

  const input = readGameFormData(formData);
  if (!input.ok) {
    return { ok: false, message: "请检查游戏信息。", errors: input.errors };
  }

  const existing = await db.game.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return { ok: false, message: "这个游戏已经不存在。", errors: { form: "游戏不存在。" } };
  }

  let coverUrl: string | null;
  try {
    coverUrl = await localizeCoverUrl(input.data.coverUrl);
  } catch (error) {
    return {
      ok: false,
      message: "封面保存失败。",
      errors: { coverUrl: remoteImageErrorMessage(error, "远程封面无法转存。可以改用本地上传，或使用 Steam CDN 封面链接。") },
    };
  }

  const game = await db.game.update({
    where: { id },
    data: {
      ...input.data,
      coverUrl,
    },
  });

  if (shouldRecordStatusTransition(existing.status, game.status, "FINISHED")) {
    await recordActivity("games", "finished", game.id, gameFinishedTitle(game.name));
  }

  revalidateGames();

  return {
    ok: true,
    gameId: game.id,
    message: "游戏已保存。",
    warning: finishedWithoutRatingWarning(input.data.status, input.data.rating),
  };
}

export async function advanceGameStatusAction(id: string) {
  await requireGameSession();

  const game = await db.game.findUnique({
    where: { id },
    select: { name: true, status: true, rating: true },
  });

  if (!game) {
    return { ok: false, message: "这个游戏已经不存在。" };
  }

  const nextStatus = nextGameStatus(game.status as GameStatusValue);
  if (!nextStatus) {
    return { ok: false, message: "当前状态没有下一步快捷流转。" };
  }

  await db.game.update({
    where: { id },
    data: { status: nextStatus },
  });

  if (shouldRecordStatusTransition(game.status, nextStatus, "FINISHED")) {
    await recordActivity("games", "finished", id, gameFinishedTitle(game.name));
  }

  revalidateGames();

  return {
    ok: true,
    message: "状态已更新。",
    warning: finishedWithoutRatingWarning(nextStatus, game.rating),
  };
}

export async function syncSteamLibraryAction(): Promise<SteamSyncActionState> {
  await requireGameSession();

  try {
    const result = await syncSteamLibrary();
    revalidateGames();

    return {
      ok: true,
      ...result,
      message: `Steam 同步完成：新增 ${result.added} 个，更新 ${result.updated} 个。`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Steam 同步失败，请稍后重试。",
    };
  }
}
