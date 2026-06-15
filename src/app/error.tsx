"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="theme-public flex min-h-screen items-center justify-center bg-bg px-5 py-12 text-ink">
      <section className="w-full max-w-2xl border-t border-border pt-8">
        <p className="mb-4 text-sm font-medium text-accent">页面出错</p>
        <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">这里暂时翻不开。</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-ink-2">
          可能是网络、数据库或页面数据临时出了问题。可以重试一次；如果还不行，稍后再回来。
        </p>
        <Button type="button" className="mt-8" onClick={reset}>
          <RotateCcw className="size-4" />
          重试
        </Button>
      </section>
    </main>
  );
}
