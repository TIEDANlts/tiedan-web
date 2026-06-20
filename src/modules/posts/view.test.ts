import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { recordPostView } from "./view";

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
  });

  it("does not consume debounce when the slug is not updated", async () => {
    updatePost.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

    await expect(recordPostView("missing-post", "client-task9", 1_000)).resolves.toEqual({ counted: false });
    await expect(recordPostView("missing-post", "client-task9", 2_000)).resolves.toEqual({ counted: true });

    expect(updatePost).toHaveBeenCalledTimes(2);
  });
});
