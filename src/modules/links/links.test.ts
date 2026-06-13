import { describe, expect, it } from "vitest";

import {
  groupLinksByGroup,
  normalizeLinkInput,
  reorderLinksWithinGroup,
} from "./utils";

const baseLink = {
  id: "link-1",
  group: "工具",
  title: "Next.js",
  url: "https://nextjs.org",
  icon: null,
  description: null,
  sort: 0,
};

describe("normalizeLinkInput", () => {
  it("trims fields and accepts http urls", () => {
    const result = normalizeLinkInput({
      group: " 工具 ",
      title: " Next.js ",
      url: " https://nextjs.org/docs ",
      icon: " /uploads/favicons/next.png ",
      description: " 框架文档 ",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        group: "工具",
        title: "Next.js",
        url: "https://nextjs.org/docs",
        icon: "/uploads/favicons/next.png",
        description: "框架文档",
      },
    });
  });

  it("returns Chinese validation errors for missing group, title and invalid url", () => {
    const result = normalizeLinkInput({
      group: " ",
      title: "",
      url: "not-a-url",
      icon: "",
      description: "",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        group: "分组不能为空。",
        title: "标题不能为空。",
        url: "请输入以 http:// 或 https:// 开头的有效链接。",
      },
    });
  });
});

describe("groupLinksByGroup", () => {
  it("keeps group order and sorts each group by sort then title", () => {
    const groups = groupLinksByGroup([
      { ...baseLink, id: "b", group: "阅读", title: "Zed", sort: 2 },
      { ...baseLink, id: "a", group: "工具", title: "Bun", sort: 2 },
      { ...baseLink, id: "c", group: "工具", title: "Astro", sort: 2 },
      { ...baseLink, id: "d", group: "工具", title: "MDN", sort: 1 },
    ]);

    expect(groups).toEqual([
      {
        group: "工具",
        links: [
          { ...baseLink, id: "d", group: "工具", title: "MDN", sort: 1 },
          { ...baseLink, id: "c", group: "工具", title: "Astro", sort: 2 },
          { ...baseLink, id: "a", group: "工具", title: "Bun", sort: 2 },
        ],
      },
      {
        group: "阅读",
        links: [{ ...baseLink, id: "b", group: "阅读", title: "Zed", sort: 2 }],
      },
    ]);
  });
});

describe("reorderLinksWithinGroup", () => {
  it("returns contiguous sort values for the dragged group only", () => {
    const updates = reorderLinksWithinGroup([
      { id: "a", group: "工具", sort: 0 },
      { id: "b", group: "工具", sort: 1 },
      { id: "c", group: "工具", sort: 2 },
      { id: "d", group: "阅读", sort: 0 },
    ], "工具", ["c", "a", "b"]);

    expect(updates).toEqual([
      { id: "c", sort: 0 },
      { id: "a", sort: 1 },
      { id: "b", sort: 2 },
    ]);
  });
});
