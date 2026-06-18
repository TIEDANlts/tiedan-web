export type PostActionState = {
  ok: boolean;
  message: string | null;
  postId?: string;
  errors?: Partial<Record<"title" | "slug" | "contentMd" | "form", string>>;
};

export const initialPostActionState: PostActionState = {
  ok: false,
  message: null,
};
