import Link from "next/link";
import { notFound } from "next/navigation";

import { ViewBeacon } from "@/app/(public)/blog/[slug]/view-beacon";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { formatShanghaiDate } from "@/lib/dayjs";
import { getPublishedPostBySlug } from "@/modules/posts/queries";
import { extractToc } from "@/modules/posts/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublishedPostBySlug(slug);

  if (!data) {
    return {};
  }

  return {
    title: data.post.title,
    description: data.post.summary ?? undefined,
  };
}

function headingIds(toc: ReturnType<typeof extractToc>) {
  const result: Record<string, string[]> = {};

  for (const item of toc) {
    result[item.text] = [...(result[item.text] ?? []), item.id];
  }

  return result;
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublishedPostBySlug(slug);

  if (!data) {
    notFound();
  }

  const toc = extractToc(data.post.contentMd);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 sm:px-10 lg:grid-cols-[minmax(0,68ch)_14rem]">
      <ViewBeacon slug={data.post.slug} />
      <article className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-ink-3">
          <time>{formatShanghaiDate(data.post.publishedAt ?? data.post.createdAt)}</time>
          {data.post.category ? <Badge variant="outline">{data.post.category}</Badge> : null}
          {data.post.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">{data.post.title}</h1>
        {data.post.summary ? (
          <p className="mt-6 text-lg leading-8 text-ink-2">{data.post.summary}</p>
        ) : null}

        <MarkdownRenderer
          value={data.post.contentMd}
          headingIds={headingIds(toc)}
          className="mt-10 text-base leading-8 [&_h2]:scroll-mt-20 [&_h2]:pt-6 [&_h3]:scroll-mt-20"
        />

        <nav className="mt-12 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
          {data.previous ? (
            <Link className="rounded-lg border border-border bg-surface p-4 hover:border-accent/50" href={`/blog/${data.previous.slug}`}>
              <span className="text-xs text-ink-3">上一篇</span>
              <p className="mt-2 font-medium text-ink">{data.previous.title}</p>
            </Link>
          ) : (
            <span />
          )}
          {data.next ? (
            <Link className="rounded-lg border border-border bg-surface p-4 text-right hover:border-accent/50" href={`/blog/${data.next.slug}`}>
              <span className="text-xs text-ink-3">下一篇</span>
              <p className="mt-2 font-medium text-ink">{data.next.title}</p>
            </Link>
          ) : null}
        </nav>
      </article>

      {toc.length > 0 ? (
        <aside className="hidden lg:block">
          <div className="sticky top-8 border-l border-border pl-4">
            <p className="mb-3 text-sm font-medium text-ink">目录</p>
            <nav className="space-y-2 text-sm text-ink-2">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={item.depth === 3 ? "block pl-4 hover:text-accent" : "block hover:text-accent"}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      ) : null}
    </main>
  );
}
