"use client";

import { PostStatus } from "@prisma/client";
import { Edit, Eye, FileText, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatShanghaiDateTime } from "@/lib/dayjs";
import { deletePostAction } from "@/modules/posts/actions";
import type { AdminPostListItem } from "@/modules/posts/queries";
import { postStatusLabel } from "@/modules/posts/utils";

function statusHref(status: string, query: string) {
  const params = new URLSearchParams();
  if (status !== "ALL") {
    params.set("status", status);
  }
  if (query.trim()) {
    params.set("q", query.trim());
  }
  const search = params.toString();
  return `/admin/posts${search ? `?${search}` : ""}`;
}

export function PostsAdmin({
  posts,
  status,
  query,
}: {
  posts: AdminPostListItem[];
  status: "ALL" | PostStatus;
  query: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftQuery, setDraftQuery] = React.useState(query);
  const [isPending, startTransition] = useTransition();

  function search() {
    const params = new URLSearchParams(searchParams);
    if (draftQuery.trim()) {
      params.set("q", draftQuery.trim());
    } else {
      params.delete("q");
    }
    router.push(`/admin/posts${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="博客管理"
        title="写作与发布"
        description="管理公开博客文章，草稿只在后台可见，发布后会刷新公开列表、详情页和 RSS。"
        actions={
          <Button asChild>
            <Link href="/admin/posts/new">
              <Plus className="size-4" />
              新建文章
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ["ALL", "全部"],
            [PostStatus.DRAFT, "草稿"],
            [PostStatus.PUBLISHED, "已发布"],
          ].map(([value, label]) => (
            <Button
              key={value}
              asChild
              variant={status === value ? "default" : "outline"}
              size="sm"
            >
              <Link href={statusHref(value, query)}>{label}</Link>
            </Button>
          ))}
        </div>

        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">搜索标题</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                search();
              }
            }}
            placeholder="搜索标题"
            className="pl-9"
          />
        </label>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="还没有文章。"
          description="先写一篇草稿，确认排版和图片都正常后再发布。"
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={post.status === PostStatus.PUBLISHED ? "default" : "outline"}>
                      {postStatusLabel(post.status)}
                    </Badge>
                    {post.category ? <span className="text-xs text-ink-3">{post.category}</span> : null}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{post.title}</h2>
                  <p className="mt-1 break-all text-xs text-ink-3">/blog/{post.slug}</p>
                  <p className="mt-2 text-sm text-ink-2">
                    更新于 {formatShanghaiDateTime(post.updatedAt)}
                    {post.publishedAt ? ` · 发布于 ${formatShanghaiDateTime(post.publishedAt)}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {post.status === PostStatus.PUBLISHED ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/blog/${post.slug}`} target="_blank">
                        <Eye className="size-3.5" />
                        查看
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/posts/${post.id}`}>
                      <Edit className="size-3.5" />
                      编辑
                    </Link>
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <Trash2 className="size-3.5" />
                        删除
                      </Button>
                    }
                    title="删除这篇文章？"
                    description={`「${post.title}」会被永久删除。`}
                    confirmLabel="删除"
                    onConfirm={() =>
                      startTransition(async () => {
                        await deletePostAction(post.id);
                      })
                    }
                  />
                </div>
              </div>
              {isPending ? <p className="mt-3 text-xs text-ink-3">正在处理...</p> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
