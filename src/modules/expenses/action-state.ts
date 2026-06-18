export type ExpenseActionState = {
  ok: boolean;
  message: string | null;
  errors?: Partial<Record<"amount" | "direction" | "categoryId" | "date" | "name" | "icon" | "keywords", string>>;
};

export const initialExpenseActionState: ExpenseActionState = {
  ok: false,
  message: null,
};
