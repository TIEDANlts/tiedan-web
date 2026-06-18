"use client";

import type { Post } from "@prisma/client";
import { PostStatus } from "@prisma/client";
import { ArrowLeft, Eye, Save, Send, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImageFile } from "@/lib/upload-client";
import { savePostAction, withdrawPostAction } from "@/modules/posts/actions";
import { initialPostActionState } from "@/modules/posts/action-state";
import { normalizeSlug, slugFromTitle } from "@/modules/posts/utils";

function fieldClass() {
  return "block space-y-2 text-sm font-medium text-ink";
}

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

export function PostEditor({ post }: { post?: Post }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [category, setCategory] = useState(post?.category ?? "");
  const [summary, setSummary] = useState(post?.summary ?? "");
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [contentMd, setContentMd] = useState(post?.contentMd ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(savePostAction, initialPostActionState);
  const [isWithdrawing, startWithdraw] = useTransition();
  const preview = useMemo(() => <MarkdownRenderer value={contentMd || "预览会显示在这里。"} />, [contentMd]);
  const visibleSlug = slugTouched ? slug : slugFromTitle(title);

  useEffect(() => {
    if (state.ok && state.postId && !post) {
      router.replace(`/admin/posts/${state.postId}`);
    }
  }, [post, router, state.ok, state.postId]);

  async function handlePasteFiles(files: File[]) {
    setUploadError(null);
    try {
      const snippets = await Promise.all(
        files.map(async (file) => {
          const { url } = await uploadImageFile(file, { area: "public", subdir: "posts" });
          return `![${file.name.replace(/\.[^.]+$/, "")}](${url})`;
        }),
      );
      setContentMd((current) => `${current}${current.endsWith("\n") || !current ? "" : "\n\n"}${snippets.join("\n\n")}`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "图片上传失败。");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <form action={formAction} className="space-y-6">
        {post ? <input type="hidden" name="id" value={post.id} /> : null}
        <input type="hidden" name="tags" value={tags.join(",")} />
        <input type="hidden" name="contentMd" value={contentMd} />

        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
              <Link href="/admin/posts">
                <ArrowLeft className="size-4" />
                回到文章列表
              </Link>
            </Button>
            <p className="mb-2 text-sm font-medium text-primary">博客管理</p>
            <h1 className="font-heading text-3xl font-semibold text-ink">
              {post ? "编辑文章" : "新建文章"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
              草稿不会出现在公开端。发布、撤回或更新已发布文章会刷新公开博客和 RSS。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {post?.status === PostStatus.PUBLISHED ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/blog/${post.slug}`} target="_blank">
                    <Eye className="size-4" />
                    查看公开页
                  </Link>
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="outline" disabled={isWithdrawing}>
                      <Undo2 className="size-4" />
                      撤回
                    </Button>
                  }
                  title="撤回这篇文章？"
                  description="撤回后公开详情页会返回 404，但后台仍可继续编辑。"
                  confirmLabel="撤回"
                  destructive={false}
                  onConfirm={() =>
                    startWithdraw(async () => {
                      await withdrawPostAction(post.id);
                      router.refresh();
                    })
                  }
                />
              </>
            ) : null}
            <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>
              <Save className="size-4" />
              存草稿
            </Button>
            <Button type="submit" name="intent" value="publish" disabled={pending}>
              <Send className="size-4" />
              发布
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="space-y-5 rounded-xl border border-border bg-surface p-4 shadow-sm">
            <label className={fieldClass()}>
              <span>标题</span>
              <Input name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
              <FieldError>{state.errors?.title}</FieldError>
            </label>

            <label className={fieldClass()}>
              <span>Slug</span>
              <Input
                name="slug"
                value={visibleSlug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(normalizeSlug(event.target.value));
                }}
                placeholder="post-20260613102030"
              />
              <FieldError>{state.errors?.slug}</FieldError>
            </label>

            <label className={fieldClass()}>
              <span>摘要</span>
              <textarea
                name="summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={3}
                className="w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm leading-6 text-ink outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-ink">正文</span>
              <MarkdownEditor
                value={contentMd}
                onChange={setContentMd}
                preview={preview}
                onPasteFiles={handlePasteFiles}
              />
              <FieldError>{state.errors?.contentMd}</FieldError>
              {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
            </div>
          </section>

          <aside className="space-y-5 rounded-xl border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-6 lg:self-start">
            <label className={fieldClass()}>
              <span>分类</span>
              <Input name="category" value={category} onChange={(event) => setCategory(event.target.value)} />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-ink">标签</span>
              <TagInput value={tags} onChange={setTags} placeholder="输入标签后回车" />
            </div>

            <div className="rounded-lg bg-surface-2 p-3 text-sm leading-6 text-ink-2">
              <p>粘贴图片到正文编辑区会自动上传并插入 Markdown。</p>
              <p className="mt-2">当前状态：{post?.status === PostStatus.PUBLISHED ? "已发布" : "草稿"}</p>
            </div>
          </aside>
        </div>

        {state.message ? (
          <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
        ) : null}
      </form>
    </main>
  );
}
