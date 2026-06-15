import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="theme-public flex min-h-screen items-center justify-center bg-bg px-5 py-12 text-ink">
      <section className="w-full max-w-2xl border-t border-border pt-8">
        <p className="mb-4 text-sm font-medium text-accent">404</p>
        <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">这一页没有收进目录。</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-ink-2">
          可能是地址写错了，也可能是内容还在草稿里。可以回到首页，或者去博客和导航找找。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">回到首页</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/blog">去博客</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
