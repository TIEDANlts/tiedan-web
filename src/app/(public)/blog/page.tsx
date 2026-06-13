export default function BlogPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10">
      <p className="mb-4 text-sm font-medium text-accent">博客</p>
      <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">文章会在这里慢慢长出来。</h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-ink-2">
        Stage 5 会接入公开博客列表、文章详情和 RSS。现在先放一个公开占位页，用来验证编辑部风格布局。
      </p>
    </main>
  );
}
