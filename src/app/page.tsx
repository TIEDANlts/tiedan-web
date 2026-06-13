import { auth } from "@/auth";
import { PrivateShell, PublicShell } from "@/components/app-shell";

function PublicHome() {
  return (
    <main className="px-6 py-10 sm:px-10 lg:px-12">
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col justify-between">
        <div className="max-w-3xl py-20">
          <p className="mb-5 text-sm font-medium text-accent">个人生活管理网站</p>
          <h1 className="font-serif text-5xl leading-tight text-ink sm:text-6xl">
            铁蛋的个人网站地基已经就位。
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-ink-2">
            这里会逐步接入游戏、书影、旅行、博客、消费、待办日历、导航和首页聚合。
            当前阶段已经加入单用户登录、权限白名单和私密页面保护。
          </p>
        </div>

        <div className="grid gap-4 border-t border-border pt-6 text-sm text-ink-2 sm:grid-cols-3">
          <div>
            <p className="font-medium text-ink">编辑部</p>
            <p className="mt-2">公开页使用克制排版和酒红点缀。</p>
          </div>
          <div>
            <p className="font-medium text-ink">收藏册</p>
            <p className="mt-2">登录后进入侧边栏布局。</p>
          </div>
          <div>
            <p className="font-medium text-ink">默认私密</p>
            <p className="mt-2">除公开白名单外，后续模块都需要登录。</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardPlaceholder() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <p className="mb-3 text-sm font-medium text-primary">仪表盘</p>
      <h1 className="font-heading text-3xl font-semibold text-ink">私人收藏册入口</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-2">
        Stage 16 会在这里接入真正的首页聚合。现在先用这个占位页验证根路径登录后进入私密外壳。
      </p>
    </main>
  );
}

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    return (
      <PrivateShell>
        <DashboardPlaceholder />
      </PrivateShell>
    );
  }

  return (
    <PublicShell>
      <PublicHome />
    </PublicShell>
  );
}
