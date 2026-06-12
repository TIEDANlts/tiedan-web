import { safeFromPath } from "@/lib/auth/routes";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    from?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { from } = await searchParams;

  return (
    <main className="theme-public flex min-h-screen items-center justify-center bg-bg px-6 py-10 text-ink">
      <div className="w-full max-w-5xl">
        <div className="mb-10 flex items-center justify-between border-b border-border pb-5 text-sm text-ink-2">
          <span className="font-semibold text-accent">TIEDAN</span>
          <span>私密入口</span>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-medium text-accent">个人生活管理网站</p>
            <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
              回到你的私人记录室。
            </h1>
            <p className="mt-6 text-base leading-7 text-ink-2">
              游戏、书影、旅行、消费和待办都会放在登录后。公开页面继续留给访客阅读。
            </p>
          </div>

          <LoginForm from={safeFromPath(from ?? "/")} />
        </div>
      </div>
    </main>
  );
}
