import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Compass,
  Film,
  Gamepad2,
  MapPin,
  NotebookPen,
  Plane,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { DashboardTodoToggle } from "@/app/dashboard-todo-toggle";
import {
  getDashboardActivity,
  getDashboardDoingMedia,
  getDashboardExpenseMonth,
  getDashboardNextTrip,
  getDashboardRecentGames,
  getDashboardSpecialDays,
  getDashboardTodos,
  getDashboardYearNumbers,
} from "@/modules/dashboard/queries";
import { cn } from "@/lib/utils";

function Widget({
  title,
  href,
  icon,
  children,
  className,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-surface p-4 shadow-sm", className)}>
      <Link href={href} className="mb-4 flex items-center justify-between gap-3 text-sm font-semibold text-ink transition hover:text-primary">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-pill bg-surface-2 text-primary">{icon}</span>
          {title}
        </span>
        <span className="text-xs font-medium text-ink-3">进入</span>
      </Link>
      {children}
    </section>
  );
}

function Cover({ src, title, className }: { src: string | null; title: string; className?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={title} className={cn("h-full w-full object-cover", className)} />
    );
  }

  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-surface-2 text-sm font-semibold text-ink-3", className)}>
      {title.slice(0, 1)}
    </div>
  );
}

const activityIcons: Record<string, LucideIcon> = {
  games: Gamepad2,
  media: Film,
  posts: BookOpen,
  trips: Plane,
  expenses: ReceiptText,
  todos: NotebookPen,
  specialDays: CalendarDays,
  links: Compass,
};

export async function TodayTodosWidget() {
  const data = await getDashboardTodos();

  return (
    <Widget title="今日待办" href="/todos" icon={<NotebookPen className="size-4" />} className="order-1">
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="text-sm text-ink-2">{data.today}</p>
        {data.overdueCount > 0 ? (
          <p className="rounded-pill bg-module-todos/10 px-2 py-1 text-xs font-semibold text-module-todos">
            逾期 {data.overdueCount} 件
          </p>
        ) : null}
      </div>
      {data.items.length > 0 ? (
        <div className="space-y-2">
          {data.items.map((todo) => (
            <div key={todo.id} className="flex gap-2 rounded-lg bg-surface-2 p-2 text-sm">
              <DashboardTodoToggle id={todo.id} done={todo.done} />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium text-ink">{todo.content}</p>
                <p className={cn("mt-1 text-xs text-ink-3", todo.overdue && "text-module-expenses")}>
                  {todo.overdue ? "已经过期，先把它收掉" : "今天安排"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-surface-2 p-3 text-sm leading-6 text-ink-2">今天没有压在手边的事，可以慢慢来。</p>
      )}
    </Widget>
  );
}

export async function MonthExpenseWidget() {
  const data = await getDashboardExpenseMonth();

  return (
    <Widget title="本月消费" href={`/expenses/stats?view=month&month=${data.month}`} icon={<ReceiptText className="size-4" />} className="order-2">
      <p className="text-3xl font-semibold text-ink">{data.totalText}</p>
      <p className="mt-2 text-sm text-ink-2">
        环比 <span className={data.mom.trend === "up" ? "text-module-expenses" : "text-module-trips"}>{data.mom.text}</span>
      </p>
      {data.topCategories.length > 0 ? (
        <div className="mt-4 space-y-3">
          {data.topCategories.map((category) => (
            <div key={category.name}>
              <div className="mb-1 flex justify-between gap-3 text-xs text-ink-2">
                <span>{category.icon ? `${category.icon} ` : ""}{category.name}</span>
                <span>{category.amountText}</span>
              </div>
              <div className="h-2 rounded-pill bg-surface-2">
                <div className="h-full rounded-pill bg-module-expenses" style={{ width: `${Math.min(100, Number(category.share))}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm leading-6 text-ink-2">这个月还没有支出流水，钱袋子很安静。</p>
      )}
    </Widget>
  );
}

export async function RecentGamesWidget() {
  const games = await getDashboardRecentGames();

  return (
    <Widget title="最近在玩" href="/games?status=PLAYING" icon={<Gamepad2 className="size-4" />} className="order-3 md:col-span-2">
      {games.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {games.map((game, index) => (
            <div key={game.id} className={cn("overflow-hidden rounded-lg bg-surface-2", index === 0 && "sm:col-span-1")}>
              <div className="aspect-[4/5] overflow-hidden">
                <Cover src={game.coverUrl} title={game.name} />
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-ink">{game.name}</p>
                <p className="mt-1 text-xs text-ink-2">近两周 {Math.round(game.playtime2w / 60)} 小时</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-surface-2 p-3 text-sm leading-6 text-ink-2">最近两周还没有游戏时长，下一次打开游戏会出现在这里。</p>
      )}
    </Widget>
  );
}

export async function DoingMediaWidget() {
  const items = await getDashboardDoingMedia();

  return (
    <Widget title="在读在看" href="/media?status=DOING" icon={<Film className="size-4" />} className="order-4">
      {items.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => (
            <Link key={item.id} href={`/media/${item.id}`} className="w-24 shrink-0">
              <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface-2">
                <Cover src={item.coverUrl} title={item.title} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-medium text-ink">{item.title}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-surface-2 p-3 text-sm leading-6 text-ink-2">书签和片单都空着，等下一本书或下一部片开场。</p>
      )}
    </Widget>
  );
}

export async function NextTripWidget() {
  const trip = await getDashboardNextTrip();

  return (
    <Widget title="下一段旅行" href="/trips" icon={<Plane className="size-4" />} className="order-5">
      {trip ? (
        <Link href={`/trips/${trip.id}`} className="block overflow-hidden rounded-lg bg-surface-2">
          <div className="aspect-[16/9] overflow-hidden">
            <Cover src={trip.coverUrl} title={trip.title} />
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold text-ink">{trip.title}</p>
            <p className="mt-1 text-xs text-ink-2">{trip.startDate} 出发</p>
            <p className="mt-3 text-2xl font-semibold text-primary">{trip.countdown === 0 ? "就在今天" : `${trip.countdown} 天后`}</p>
          </div>
        </Link>
      ) : (
        <p className="rounded-lg bg-surface-2 p-3 text-sm leading-6 text-ink-2">暂时没有排好的下一段旅行，地图先留白。</p>
      )}
    </Widget>
  );
}

export async function SpecialDaysWidget() {
  const days = await getDashboardSpecialDays();

  return (
    <Widget title="未来 14 天" href="/calendar" icon={<CalendarDays className="size-4" />} className="order-6">
      {days.length > 0 ? (
        <div className="space-y-2">
          {days.map((day) => (
            <Link key={day.id} href={day.href} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 p-2 text-sm">
              <span className="line-clamp-1 font-medium text-ink">{day.title}</span>
              <span className="shrink-0 text-xs text-ink-3">{day.date.slice(5)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-surface-2 p-3 text-sm leading-6 text-ink-2">接下来两周没有特别标记的日子。</p>
      )}
    </Widget>
  );
}

export async function YearNumbersWidget() {
  const data = await getDashboardYearNumbers();
  const badges = [
    { label: "通关", value: data.gamesFinished, className: "bg-module-games/15 text-module-games", icon: Gamepad2 },
    { label: "读完", value: data.booksDone, className: "bg-module-media/15 text-module-media", icon: BookOpen },
    { label: "看完", value: data.moviesDone + data.tvDone, className: "bg-module-trips/15 text-module-trips", icon: Film },
    { label: "发文", value: data.posts, className: "bg-module-posts/15 text-module-posts", icon: BadgeCheck },
  ];

  return (
    <Widget title="今年数字" href="/calendar" icon={<Sparkles className="size-4" />} className="order-7 md:col-span-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <div key={badge.label} className={cn("rounded-xl p-4", badge.className)}>
              <Icon className="size-5" />
              <p className="mt-4 text-3xl font-semibold">{badge.value}</p>
              <p className="mt-1 text-sm font-medium">{data.year} {badge.label}</p>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

export async function ActivityTimelineWidget() {
  const groups = await getDashboardActivity();

  return (
    <Widget title="活动时间线" href="/" icon={<MapPin className="size-4" />} className="order-8 md:col-span-2">
      {groups.length > 0 ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.date}>
              <p className="mb-2 text-xs font-semibold text-ink-3">{group.label}</p>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <Link key={item.id} href={item.href} className="flex items-start gap-3 rounded-lg bg-surface-2 p-3 text-sm transition hover:bg-bg">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-pill bg-surface text-primary">
                      {(() => {
                        const Icon = activityIcons[item.module] ?? Sparkles;
                        return <Icon className="size-3.5" />;
                      })()}
                    </span>
                    <span className="mt-0.5 text-xs font-medium text-ink-3">{item.time}</span>
                    <span className="min-w-0 flex-1 break-words text-ink">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-surface-2 p-3 text-sm leading-6 text-ink-2">完成游戏、读完书、发布文章或导入账单后，这里会留下脚印。</p>
      )}
    </Widget>
  );
}
