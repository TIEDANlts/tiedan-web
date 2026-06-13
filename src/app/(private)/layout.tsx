import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { logoutAction } from "./actions";

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="theme-private min-h-screen bg-bg text-ink">
      <header className="border-b border-border bg-surface/80">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-primary">TIEDAN</p>
            <p className="text-xs text-ink-2">私人收藏册</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              退出登录
            </Button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
