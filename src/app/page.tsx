import { ArrowUpRight, BookOpen, Compass } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { PrivateShell, PublicShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  ActivityTimelineWidget,
  DoingMediaWidget,
  MonthExpenseWidget,
  NextTripWidget,
  RecentGamesWidget,
  SpecialDaysWidget,
  TodayTodosWidget,
  YearNumbersWidget,
} from "@/app/dashboard-widgets";
import { getRecentPublishedPosts } from "@/modules/posts/queries";
import { getProfileSettings } from "@/modules/settings/settings";

export const dynamic = "force-dynamic";

function textExcerpt(value: string | null | undefined, fallback: string) {
  const text = value?.trim() || fallback;
  return text.length > 112 ? `${text.slice(0, 112)}...` : text;
}

async function PublicHome() {
  const [profile, posts] = await Promise.all([
    getProfileSettings(),
    getRecentPublishedPosts(3),
  ]);

  return (
    <main className="px-5 py-10 sm:px-8 lg:px-12">
      <section className="mx-auto grid min-h-[calc(100vh-9rem)] w-full max-w-6xl content-between gap-10">
        <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:pt-16">
          <div>
            <div className="mb-8 flex items-center gap-4">
              <div className="size-16 overflow-hidden rounded-full border border-border bg-surface-2">
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-2xl text-accent">
                    {profile.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-accent">个人生活管理网站</p>
                <h1 className="mt-1 font-serif text-4xl leading-tight text-ink sm:text-6xl">{profile.name}</h1>
              </div>
            </div>

            <p className="max-w-2xl text-xl leading-9 text-ink-2">{profile.bio}</p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/blog">
                  <BookOpen className="size-4" />
                  前往博客
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/nav">
                  <Compass className="size-4" />
                  打开导航
                </Link>
              </Button>
            </div>
          </div>

          <aside className="border-l-0 border-border lg:border-l lg:pl-8">
            <p className="mb-4 text-sm font-semibold text-accent">最近文章</p>
            {posts.length > 0 ? (
              <div className="space-y-5">
                {posts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group block border-b border-border pb-5 last:border-b-0">
                    <p className="text-xs text-ink-3">
                      {post.publishedAt ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(post.publishedAt) : "刚刚发布"}
                    </p>
                    <h2 className="mt-2 font-serif text-2xl leading-tight text-ink transition group-hover:text-accent">
                      {post.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-ink-2">{textExcerpt(post.summary, "这篇文章还没有摘要，点进去读正文。")}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-ink-2">博客还在等第一篇正式发布的文章。</p>
            )}
          </aside>
        </div>

        <div className="grid gap-4 border-t border-border pt-6 text-sm text-ink-2 sm:grid-cols-3">
          <Link href="/blog" className="group">
            <span className="flex items-center gap-2 font-medium text-ink">
              博客
              <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            <span className="mt-2 block">文章、整理和一些长一点的想法。</span>
          </Link>
          <Link href="/nav" className="group">
            <span className="flex items-center gap-2 font-medium text-ink">
              导航
              <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            <span className="mt-2 block">常用站点和工具入口。</span>
          </Link>
          <Link href="/login" className="group">
            <span className="flex items-center gap-2 font-medium text-ink">
              后台
              <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            <span className="mt-2 block">登录后进入私人收藏册。</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

function PrivateDashboard() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="mb-2 text-sm font-medium text-primary">仪表盘</p>
        <h1 className="font-heading text-3xl font-semibold text-ink">今天的收藏册快照</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
          把待办、游戏、书影、旅行、消费和最近完成的事放在同一页，先看今天，再回到具体模块。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TodayTodosWidget />
        <MonthExpenseWidget />
        <RecentGamesWidget />
        <DoingMediaWidget />
        <NextTripWidget />
        <SpecialDaysWidget />
        <YearNumbersWidget />
        <ActivityTimelineWidget />
      </div>
    </main>
  );
}

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    return (
      <PrivateShell>
        <PrivateDashboard />
      </PrivateShell>
    );
  }

  return (
    <PublicShell>
      <PublicHome />
    </PublicShell>
  );
}
