export type TodoActionState = {
  ok: boolean;
  message: string | null;
  errors?: Partial<Record<"content" | "date" | "priority" | "target", string>>;
};

export const initialTodoActionState: TodoActionState = {
  ok: false,
  message: null,
};
