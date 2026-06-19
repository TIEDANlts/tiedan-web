import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  db: {
    todo: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { updateTodoDateAction } from "./actions";

describe("updateTodoDateAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns a business error and skips the database for normalized invalid dates", async () => {
    await expect(updateTodoDateAction("todo-1", "2026-02-31")).resolves.toMatchObject({
      ok: false,
    });

    expect(mocks.auth).toHaveBeenCalled();
    expect(mocks.db.todo.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
