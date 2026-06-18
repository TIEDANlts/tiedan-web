"use client";

import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import zhCnLocale from "@fullcalendar/core/locales/zh-cn";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import { CalendarDays, Check, List, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { dayjs, formatShanghaiDate } from "@/lib/dayjs";
import { moduleColors, moduleLabels } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventModule } from "@/lib/calendar";
import { SpecialDayQuickForm } from "@/modules/special-days/special-day-quick-form";
import { createTodoAction } from "@/modules/todos/actions";
import { initialTodoActionState } from "@/modules/todos/action-state";

const moduleOrder: CalendarEventModule[] = ["todos", "trips", "specialDays", "media"];
const hiddenModulesKey = "calendar:hiddenModules:v1";

type CalendarView = "dayGridMonth" | "listWeek";
type Range = {
  start: string;
  end: string;
};

function isCalendarView(value: string): value is CalendarView {
  return value === "dayGridMonth" || value === "listWeek";
}

function defaultCalendarView(): CalendarView {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    return "listWeek";
  }

  return "dayGridMonth";
}

function bufferedRange(arg: DatesSetArg): Range {
  const start = dayjs(formatShanghaiDate(arg.view.currentStart)).subtract(7, "day").format("YYYY-MM-DD");
  const end = dayjs(formatShanghaiDate(arg.view.currentEnd)).add(7, "day").format("YYYY-MM-DD");

  return { start, end };
}

function readHiddenModules() {
  if (typeof window === "undefined") {
    return new Set<CalendarEventModule>();
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(hiddenModulesKey) ?? "[]") as unknown;
    if (!Array.isArray(stored)) {
      return new Set<CalendarEventModule>();
    }

    return new Set(stored.filter((item): item is CalendarEventModule => moduleOrder.includes(item as CalendarEventModule)));
  } catch {
    return new Set<CalendarEventModule>();
  }
}

function writeHiddenModules(modules: Set<CalendarEventModule>) {
  window.localStorage.setItem(hiddenModulesKey, JSON.stringify([...modules]));
}

function toFullCalendarEvent(event: CalendarEvent): EventInput {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.color,
    borderColor: event.color,
    textColor: "#000",
    extendedProps: {
      href: event.href,
      module: event.module,
    },
  };
}

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

function TodoQuickForm({
  date,
  onSaved,
}: {
  date: string;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createTodoAction, initialTodoActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onSaved?.();
    }
  }, [onSaved, state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="target" value="date" />
      <input type="hidden" name="date" value={date} />
      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>待办内容</span>
        <Input name="content" autoComplete="off" placeholder="写下这天要处理的事" />
        <FieldError>{state.errors?.content}</FieldError>
      </label>
      {state.message ? (
        <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}
      <FieldError>{state.errors?.date}</FieldError>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "添加中..." : "添加待办"}
        </Button>
      </div>
    </form>
  );
}

function ViewButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      {children}
    </Button>
  );
}

export function CalendarClient() {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const [view, setView] = useState<CalendarView>(defaultCalendarView);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [range, setRange] = useState<Range | null>(null);
  const [hiddenModules, setHiddenModules] = useState<Set<CalendarEventModule>>(readHiddenModules);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [quickMode, setQuickMode] = useState<"todo" | "specialDay">("todo");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (nextRange: Range, signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ start: nextRange.start, end: nextRange.end });
      const response = await fetch(`/api/calendar/events?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const body = (await response.json()) as { events?: CalendarEvent[]; error?: string };

      if (!response.ok || !body.events) {
        throw new Error(body.error || "日历事件暂时无法加载。");
      }

      setEvents(body.events);
    } catch (caughtError) {
      if ((caughtError as Error).name === "AbortError") {
        return;
      }

      setError(caughtError instanceof Error ? caughtError.message : "日历事件暂时无法加载。");
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => fetchControllerRef.current?.abort();
  }, []);

  const visibleEvents = useMemo(
    () => events.filter((event) => !hiddenModules.has(event.module)).map(toFullCalendarEvent),
    [events, hiddenModules],
  );

  function changeView(nextView: CalendarView) {
    setView(nextView);
    calendarRef.current?.getApi().changeView(nextView);
  }

  function toggleModule(module: CalendarEventModule) {
    setHiddenModules((current) => {
      const next = new Set(current);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      writeHiddenModules(next);
      return next;
    });
  }

  function handleDatesSet(arg: DatesSetArg) {
    const nextRange = bufferedRange(arg);
    if (range?.start !== nextRange.start || range.end !== nextRange.end) {
      fetchControllerRef.current?.abort();
      const controller = new AbortController();
      fetchControllerRef.current = controller;
      setRange(nextRange);
      void fetchEvents(nextRange, controller.signal);
    }
    if (isCalendarView(arg.view.type)) {
      setView(arg.view.type);
    }
  }

  function handleEventClick(arg: EventClickArg) {
    arg.jsEvent.preventDefault();
    const props = arg.event.extendedProps as { href?: string };
    if (props.href) {
      router.push(props.href);
    }
  }

  function handleDateClick(arg: DateClickArg) {
    setQuickMode("todo");
    setSelectedDate(arg.dateStr.slice(0, 10));
  }

  function handleSaved() {
    setSelectedDate(null);
    router.refresh();
    if (range) {
      void fetchEvents(range);
    }
  }

  return (
    <section className="calendar-shell space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <ViewButton
            active={view === "dayGridMonth"}
            icon={<CalendarDays className="size-4" />}
            onClick={() => changeView("dayGridMonth")}
          >
            月
          </ViewButton>
          <ViewButton
            active={view === "listWeek"}
            icon={<List className="size-4" />}
            onClick={() => changeView("listWeek")}
          >
            列表
          </ViewButton>
          {isLoading ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-surface-2 px-2 text-xs text-ink-2">
              <Loader2 className="size-3 animate-spin" />
              同步中
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {moduleOrder.map((module) => {
            const hidden = hiddenModules.has(module);

            return (
              <button
                key={module}
                type="button"
                aria-pressed={!hidden}
                className={cn(
                  "inline-flex h-7 items-center gap-2 rounded-lg border px-2 text-xs font-medium transition",
                  hidden
                    ? "border-border bg-surface-2 text-ink-3"
                    : "border-border bg-surface text-ink hover:border-ink-3",
                )}
                onClick={() => toggleModule(module)}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: hidden ? "var(--ink-3)" : moduleColors[module] }}
                />
                {moduleLabels[module]}
                {!hidden ? <Check className="size-3" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface p-2 shadow-sm sm:p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView={view}
          locale={zhCnLocale}
          firstDay={1}
          timeZone="Asia/Shanghai"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{
            today: "今天",
          }}
          height="auto"
          dayMaxEvents={3}
          moreLinkContent={(arg) => `+${arg.num}`}
          events={visibleEvents}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventDisplay="block"
          fixedWeekCount={false}
          listDayFormat={{ weekday: "long", month: "numeric", day: "numeric" }}
          listDaySideFormat={false}
        />
      </div>

      <Dialog open={Boolean(selectedDate)} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDate} 快速新建</DialogTitle>
            <DialogDescription>把这一天需要记住或处理的事情直接放进日历。</DialogDescription>
          </DialogHeader>
          {selectedDate ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-1">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center justify-center gap-2 rounded-md text-sm font-medium transition",
                    quickMode === "todo" ? "bg-surface text-module-todos shadow-sm" : "text-ink-2 hover:text-ink",
                  )}
                  onClick={() => setQuickMode("todo")}
                >
                  <Plus className="size-4" />
                  新建待办
                </button>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center justify-center gap-2 rounded-md text-sm font-medium transition",
                    quickMode === "specialDay"
                      ? "bg-surface text-module-special-days shadow-sm"
                      : "text-ink-2 hover:text-ink",
                  )}
                  onClick={() => setQuickMode("specialDay")}
                >
                  <CalendarDays className="size-4" />
                  新建重要日子
                </button>
              </div>
              {quickMode === "todo" ? (
                <TodoQuickForm date={selectedDate} onSaved={handleSaved} />
              ) : (
                <SpecialDayQuickForm date={selectedDate} onSaved={handleSaved} />
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
