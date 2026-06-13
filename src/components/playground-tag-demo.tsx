"use client";

import * as React from "react";

import { MarkdownEditor, RatingStars, TagInput } from "@/components";

export function PlaygroundTagDemo() {
  const [tags, setTags] = React.useState(["收藏册", "Stage 2"]);
  const [rating, setRating] = React.useState(7);
  const [markdown, setMarkdown] = React.useState("## 编辑器预览\n\n这里是客户端预览区域，正式渲染见下方 MarkdownRenderer。");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">输入与评分</h2>
        <div className="space-y-5">
          <TagInput value={tags} onChange={setTags} />
          <div>
            <p className="mb-2 text-sm text-ink-2">可编辑评分：{rating}/10</p>
            <RatingStars value={rating} editable onChange={setRating} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">MarkdownEditor</h2>
        <MarkdownEditor
          value={markdown}
          onChange={setMarkdown}
          preview={<div className="whitespace-pre-wrap text-sm leading-7 text-ink-2">{markdown}</div>}
        />
      </section>
    </div>
  );
}
