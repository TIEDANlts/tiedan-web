export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-between px-6 py-10 sm:px-10 lg:px-12">
        <div className="flex items-center justify-between border-b border-border pb-5 text-sm text-ink-2">
          <span className="font-semibold text-accent">TIEDAN</span>
          <span>Stage 0</span>
        </div>

        <div className="max-w-3xl py-20">
          <p className="mb-5 text-sm font-medium text-accent">个人生活管理网站</p>
          <h1 className="font-serif text-5xl leading-tight text-ink sm:text-6xl">
            铁蛋的个人网站地基已经就位。
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-ink-2">
            这里会逐步接入游戏、书影、旅行、博客、消费、待办日历、导航和首页聚合。
            当前阶段先把主题 token、数据库、测试链路和工程骨架搭稳。
          </p>
        </div>

        <div className="grid gap-4 border-t border-border pt-6 text-sm text-ink-2 sm:grid-cols-3">
          <div>
            <p className="font-medium text-ink">编辑部</p>
            <p className="mt-2">公开页使用克制排版和酒红点缀。</p>
          </div>
          <div>
            <p className="font-medium text-ink">收藏册</p>
            <p className="mt-2">私密页预留温暖、圆润的模块色系统。</p>
          </div>
          <div>
            <p className="font-medium text-ink">不散写颜色</p>
            <p className="mt-2">后续组件统一使用语义 token。</p>
          </div>
        </div>
      </section>
    </main>
  );
}
