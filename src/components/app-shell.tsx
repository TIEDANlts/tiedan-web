"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BookOpen,
  CalendarDays,
  Film,
  FolderCog,
  Gamepad2,
  Home,
  LinkIcon,
  LogOut,
  Menu,
  Moon,
  Plane,
  ReceiptText,
  Settings,
  Sun,
  SunMoon,
  X,
} from "lucide-react";
import * as React from "react";

import { logoutAction } from "@/app/(private)/actions";
import { Button } from "@/components/ui/button";
import { isThemeOptionActive } from "@/components/app-shell-utils";
import { cn } from "@/lib/utils";

function subscribeToMountedStore() {
  return () => {};
}

function clientMountedSnapshot() {
  return true;
}

function serverMountedSnapshot() {
  return false;
}

const navItems = [
  { href: "/", label: "仪表盘", icon: Home },
  { href: "/todos", label: "待办", icon: BookOpen },
  { href: "/calendar", label: "日历", icon: CalendarDays },
  { href: "/games", label: "游戏", icon: Gamepad2 },
  { href: "/media", label: "书影", icon: Film },
  { href: "/trips", label: "旅行", icon: Plane },
  { href: "/expenses", label: "消费", icon: ReceiptText },
  { href: "/admin/expense-categories", label: "消费分类", icon: FolderCog },
  { href: "/admin/posts", label: "博客管理", icon: BookOpen },
  { href: "/admin/links", label: "导航管理", icon: LinkIcon },
  { href: "/admin/settings", label: "设置", icon: Settings },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeSwitch() {
  const { setTheme, theme } = useTheme();
  const mounted = React.useSyncExternalStore(subscribeToMountedStore, clientMountedSnapshot, serverMountedSnapshot);
  const options = [
    { value: "light", label: "亮色", icon: Sun },
    { value: "dark", label: "暗色", icon: Moon },
    { value: "system", label: "跟随", icon: SunMoon },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-1 rounded-pill border border-border bg-surface-2 p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const active = isThemeOptionActive(mounted, theme, option.value);

        return (
          <button
            key={option.value}
            type="button"
            aria-label={`切换到${option.label}主题`}
            title={`切换到${option.label}主题`}
            onClick={() => setTheme(option.value)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1 rounded-pill px-2 text-xs font-medium text-ink-2 transition hover:text-ink",
              active && "bg-surface text-primary shadow-sm",
            )}
          >
            <Icon className="size-3.5" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-surface text-ink">
      <div className="border-b border-border px-5 py-5">
        <p className="text-sm font-semibold tracking-wide text-primary">TIEDAN</p>
        <p className="mt-1 text-xs text-ink-2">私人收藏册</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink",
                active && "bg-surface-2 text-primary shadow-sm",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border p-3">
        <ThemeSwitch />
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full justify-start">
            <LogOut className="size-4" />
            退出登录
          </Button>
        </form>
      </div>
    </div>
  );
}

export function PrivateShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="theme-private min-h-screen bg-bg text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface md:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="关闭菜单"
            className="absolute inset-0 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-[min(20rem,calc(100vw-2rem))] border-r border-border shadow-xl">
            <div className="absolute right-3 top-3 z-10">
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="size-4" />
                <span className="sr-only">关闭菜单</span>
              </Button>
            </div>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div>
              <p className="text-sm font-semibold text-primary">TIEDAN</p>
              <p className="text-xs text-ink-2">私人收藏册</p>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)}>
              <Menu className="size-4" />
              <span className="sr-only">打开菜单</span>
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

type PublicShellProps = {
  children: React.ReactNode;
  icpBeianNo?: string;
  gonganBeianNo?: string;
};

export function PublicShell({ children, icpBeianNo, gonganBeianNo }: PublicShellProps) {
  const hasBeianInfo = Boolean(icpBeianNo || gonganBeianNo);

  return (
    <div className="theme-public min-h-screen bg-bg text-ink">
      <header className="border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="font-serif text-xl font-semibold text-ink">
            TIEDAN
          </Link>
          <nav className="flex items-center gap-4 text-sm text-ink-2">
            <Link className="transition hover:text-accent" href="/blog">
              博客
            </Link>
            <Link className="transition hover:text-accent" href="/nav">
              导航
            </Link>
            <Link
              className="rounded-md border border-border px-3 py-1.5 font-medium text-accent transition hover:bg-surface"
              href="/login"
            >
              进入后台
            </Link>
          </nav>
        </div>
      </header>
      {children}
      {hasBeianInfo ? (
        <footer className="border-t border-border bg-bg">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <span>© TIEDAN</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {icpBeianNo ? <span>{icpBeianNo}</span> : null}
              {gonganBeianNo ? <span>{gonganBeianNo}</span> : null}
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
