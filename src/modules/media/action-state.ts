export type MediaActionState = {
  ok: boolean;
  message: string | null;
  itemId?: string;
  warning?: string;
  errors?: Partial<
    Record<
      "type" | "title" | "year" | "coverUrl" | "status" | "rating" | "startedAt" | "finishedAt" | "releaseDate" | "form",
      string
    >
  >;
};

export const initialMediaActionState: MediaActionState = {
  ok: false,
  message: null,
};
