import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatShanghaiDate } from "@/lib/dayjs";
import { getPublishedPostsPage } from "@/modules/posts/queries";
import { createExcerpt } from "@/modules/posts/utils";

function pageHref(page: number) {
  return page <= 1 ? "/blog" : `/blog/page/${page}`;
}

export async function BlogListPage({ page }: { page: number }) {
  const data = await getPublishedPostsPage(page);

  if (page > data.totalPages) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10">
      <p className="mb-4 text-sm font-medium text-accent">博客</p>
      <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">写下来的日常和想法。</h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-ink-2">
        这里放公开文章：项目记录、生活观察，和那些值得慢慢整理的长段文字。
      </p>

      {data.posts.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-border bg-surface px-5 py-12 text-center">
          <h2 className="font-serif text-2xl text-ink">还没有发布的文章。</h2>
          <p className="mt-3 text-sm leading-6 text-ink-2">等第一篇文章发布后，这里会按时间排好。</p>
        </div>
      ) : (
        <div className="mt-12 divide-y divide-border border-y border-border">
          {data.posts.map((post) => (
            <article key={post.id} className="py-8">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-3">
                <time>{formatShanghaiDate(post.publishedAt ?? post.createdAt)}</time>
                {post.category ? <Badge variant="outline">{post.category}</Badge> : null}
                {post.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              <h2 className="font-serif text-3xl leading-tight text-ink transition hover:text-accent">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ink-2">
                {createExcerpt(post.contentMd, post.summary)}
              </p>
            </article>
          ))}
        </div>
      )}

      {data.totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-between gap-3">
          <Button asChild variant="outline" aria-disabled={data.page <= 1}>
            <Link href={pageHref(data.page - 1)} className={data.page <= 1 ? "pointer-events-none opacity-40" : ""}>
              上一页
            </Link>
          </Button>
          <span className="text-sm text-ink-3">
            第 {data.page} / {data.totalPages} 页
          </span>
          <Button asChild variant="outline" aria-disabled={data.page >= data.totalPages}>
            <Link
              href={pageHref(data.page + 1)}
              className={data.page >= data.totalPages ? "pointer-events-none opacity-40" : ""}
            >
              下一页
            </Link>
          </Button>
        </nav>
      ) : null}
    </main>
  );
}
