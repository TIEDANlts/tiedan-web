"use client";

import dynamic from "next/dynamic";

export const DynamicCalendar = dynamic(
  () => import("./calendar-client").then((mod) => mod.CalendarClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[28rem] items-center justify-center rounded-xl border border-border bg-surface text-sm text-ink-2">
        日历加载中...
      </div>
    ),
  },
);
