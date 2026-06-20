import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { recordPostView, resetPostViewDebounceForTest } from "./view";

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      updateMany: vi.fn(),
    },
  },
}));

const updatePost = vi.mocked(db.post.updateMany);

describe("recordPostView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPostViewDebounceForTest();
  });

  it("does not consume debounce when the slug is not updated", async () => {
    updatePost.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

    await expect(recordPostView("missing-post", "client-task9", 1_000)).resolves.toEqual({ counted: false });
    await expect(recordPostView("missing-post", "client-task9", 2_000)).resolves.toEqual({ counted: true });

    expect(updatePost).toHaveBeenCalledTimes(2);
  });

  it("reserves the debounce key while a count update is in flight", async () => {
    const firstUpdate = Promise.withResolvers<{ count: number }>();
    updatePost.mockReturnValueOnce(firstUpdate.promise as never);

    const first = recordPostView("hello", "client-concurrent", 10_000);
    await expect(recordPostView("hello", "client-concurrent", 10_001)).resolves.toEqual({ counted: false });

    firstUpdate.resolve({ count: 1 });
    await expect(first).resolves.toEqual({ counted: true });
    expect(updatePost).toHaveBeenCalledTimes(1);
  });
});
