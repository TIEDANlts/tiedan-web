export type GameActionState = {
  ok: boolean;
  message: string | null;
  gameId?: string;
  warning?: string;
  errors?: Partial<
    Record<"name" | "platform" | "coverUrl" | "status" | "rating" | "playtimeHours" | "lastPlayedAt" | "form", string>
  >;
};

export type SteamSyncActionState = {
  ok: boolean;
  message: string;
  added?: number;
  updated?: number;
};

export const initialGameActionState: GameActionState = {
  ok: false,
  message: null,
};
