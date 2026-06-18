import { describe, expect, it } from "vitest";

import {
  buildViewKey,
  createExcerpt,
  extractToc,
  normalizePostInput,
  parseBlogPageParam,
  postStatusLabel,
  readPostFormData,
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

describe("readPostFormData", () => {
  it("reads FormData and normalizes comma-separated tags", () => {
    const formData = new FormData();
    formData.set("title", " Hello Post ");
    formData.set("slug", "hello-post");
    formData.set("category", " Notes ");
    formData.set("tags", "daily, writing, daily,,");
    formData.set("summary", " Short summary ");
    formData.set("contentMd", " Body ");

    expect(readPostFormData(formData)).toEqual({
      ok: true,
      data: {
        title: "Hello Post",
        slug: "hello-post",
        category: "Notes",
        tags: ["daily", "writing"],
        summary: "Short summary",
        contentMd: "Body",
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

describe("parseBlogPageParam", () => {
  it("accepts positive integer page params", () => {
    expect(parseBlogPageParam("1")).toBe(1);
    expect(parseBlogPageParam("12")).toBe(12);
  });

  it("rejects invalid or non-positive page params", () => {
    expect(parseBlogPageParam("foo")).toBeNull();
    expect(parseBlogPageParam("1.5")).toBeNull();
    expect(parseBlogPageParam("0")).toBeNull();
    expect(parseBlogPageParam("-1")).toBeNull();
  });
});
