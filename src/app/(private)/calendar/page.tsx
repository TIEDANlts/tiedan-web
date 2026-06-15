import { DynamicCalendar } from "./calendar-dynamic";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+4rem)] sm:px-6 lg:px-8">
      <header className="border-b border-border pb-5">
        <p className="mb-2 text-sm font-medium text-module-special-days">日历</p>
        <h1 className="font-heading text-3xl font-semibold text-ink">全局日历</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-2">
          待办、旅行、重要日子和书影上映日会按当前月份聚合到这里。
        </p>
      </header>
      <DynamicCalendar />
    </main>
  );
}
