import { describe, expect, it } from "vitest";

import {
  buildViewKey,
  createExcerpt,
  extractToc,
  normalizePostInput,
  postStatusLabel,
  slugFromTitle,
} from "./utils";

describe("slugFromTitle", () => {
  it("creates readable slugs for Latin titles", () => {
    expect(slugFromTitle("Hello, Stage 5: Blog Storage!")).toBe("hello-stage-5-blog-storage");
  });

  it("falls back to post timestamp for Chinese titles", () => {
    expect(slugFromTitle("今天写一篇博客", new Date("2026-06-13T10:20:30.000Z"))).toBe(
      "post-20260613102030",
    );
  });
});

describe("normalizePostInput", () => {
  it("trims fields, normalizes tags, and validates required fields", () => {
    const result = normalizePostInput(
      {
        title: "  第一篇文章  ",
        slug: "",
        category: " 随笔 ",
        tags: ["  日常 ", "日常", " 写作 "],
        summary: "",
        contentMd: "正文",
      },
      new Date("2026-06-13T10:20:30.000Z"),
    );

    expect(result).toEqual({
      ok: true,
      data: {
        title: "第一篇文章",
        slug: "post-20260613102030",
        category: "随笔",
        tags: ["日常", "写作"],
        summary: null,
        contentMd: "正文",
      },
    });
  });

  it("returns Chinese validation errors", () => {
    const result = normalizePostInput({
      title: "",
      slug: "bad slug!",
      tags: [],
      contentMd: "",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        title: "标题不能为空。",
        slug: "Slug 只能包含小写字母、数字和连字符。",
        contentMd: "正文不能为空。",
      },
    });
  });
});

describe("extractToc", () => {
  it("extracts h2 and h3 headings with stable anchors", () => {
    expect(extractToc("## 第一节\n\n### Hello World\n\n# 不进目录\n\n## 第一节")).toEqual([
      { depth: 2, text: "第一节", id: "section-1" },
      { depth: 3, text: "Hello World", id: "hello-world" },
      { depth: 2, text: "第一节", id: "section-1-2" },
    ]);
  });
});

describe("createExcerpt", () => {
  it("prefers explicit summary and otherwise strips markdown", () => {
    expect(createExcerpt("正文", "  摘要  ")).toBe("摘要");
    expect(createExcerpt("## 标题\n\n这是一段 **正文**，[链接](https://example.com)。")).toBe(
      "标题 这是一段 正文，链接。",
    );
  });
});

describe("view debounce helpers", () => {
  it("builds a stable key from ip and slug", () => {
    expect(buildViewKey("127.0.0.1", "hello")).toBe("127.0.0.1:hello");
  });

  it("maps post status labels to Chinese", () => {
    expect(postStatusLabel("DRAFT")).toBe("草稿");
    expect(postStatusLabel("PUBLISHED")).toBe("已发布");
  });
});
