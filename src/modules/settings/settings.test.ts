import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { getProfileSettings, saveProfileSettings } from "./settings";

vi.mock("@/lib/db", () => ({
  db: {
    setting: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const findMany = vi.mocked(db.setting.findMany);
const upsert = vi.mocked(db.setting.upsert);

describe("getProfileSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns stored profile values with fallbacks for missing keys", async () => {
    findMany.mockResolvedValue([
      { key: "profile.name", value: "铁蛋" },
      { key: "profile.bio", value: "写写生活，也整理生活。" },
    ]);

    await expect(getProfileSettings()).resolves.toEqual({
      name: "铁蛋",
      bio: "写写生活，也整理生活。",
      avatar: null,
    });
  });
});

describe("saveProfileSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts the editable profile keys", async () => {
    upsert.mockResolvedValue({ key: "profile.name", value: "铁蛋" });

    await saveProfileSettings({
      name: " 铁蛋 ",
      bio: " 生活索引 ",
      avatar: "/uploads/profile/avatar.webp",
    });

    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "profile.name" },
      create: { key: "profile.name", value: "铁蛋" },
      update: { value: "铁蛋" },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "profile.bio" },
      create: { key: "profile.bio", value: "生活索引" },
      update: { value: "生活索引" },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "profile.avatar" },
      create: { key: "profile.avatar", value: "/uploads/profile/avatar.webp" },
      update: { value: "/uploads/profile/avatar.webp" },
    });
  });
});
