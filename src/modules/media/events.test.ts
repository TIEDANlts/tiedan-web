import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../lib/db";
import { moduleColors } from "../../lib/design";
import { getEvents } from "./events";

vi.mock("../../lib/db", () => ({
  db: {
    mediaItem: {
      findMany: vi.fn(),
    },
  },
}));

const findMany = vi.mocked(db.mediaItem.findMany);

describe("media calendar events", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("renders wishlist release dates in range as release events", async () => {
    findMany.mockResolvedValue([
      {
        id: "media-1",
        title: "沙丘 3",
        releaseDate: new Date("2026-07-18T00:00:00.000Z"),
      },
    ] as Awaited<ReturnType<typeof db.mediaItem.findMany>>);

    await expect(getEvents("2026-07-01", "2026-08-01")).resolves.toEqual([
      {
        id: "media:media-1",
        module: "media",
        title: "《沙丘 3》上映",
        start: "2026-07-18",
        allDay: true,
        color: moduleColors.media,
        href: "/media/media-1",
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: "WISHLIST",
        releaseDate: {
          gte: new Date("2026-07-01T00:00:00.000Z"),
          lt: new Date("2026-08-01T00:00:00.000Z"),
        },
      },
    }));
  });
});
