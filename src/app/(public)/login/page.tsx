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
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-10 text-ink">
      <div className="w-full max-w-5xl">
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
