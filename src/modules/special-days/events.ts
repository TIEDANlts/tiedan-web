import type { CalendarEvent } from "../../lib/calendar";
import { formatShanghaiDate } from "../../lib/dayjs";
import { moduleColors } from "../../lib/design";

export type SpecialDayRecord = {
  id: string;
  title: string;
  date: Date;
  yearlyRepeat: boolean;
  icon: string | null;
  note: string | null;
};

function dateFromInput(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function occurrenceForYear(sourceDate: Date, year: number) {
  const monthDay = formatShanghaiDate(sourceDate).slice(5);

  if (monthDay === "02-29" && !isLeapYear(year)) {
    return `${year}-02-28`;
  }

  return `${year}-${monthDay}`;
}

function eventTitle(day: SpecialDayRecord) {
  return day.icon ? `${day.icon} ${day.title}` : day.title;
}

function buildEvent(day: SpecialDayRecord, occurrence: string): CalendarEvent {
  return {
    id: day.yearlyRepeat ? `specialDays:${day.id}:${occurrence}` : `specialDays:${day.id}`,
    module: "specialDays",
    title: eventTitle(day),
    start: occurrence,
    allDay: true,
    color: moduleColors.specialDays,
    href: `/calendar?date=${occurrence}`,
  };
}

export function expandSpecialDayEvents(days: SpecialDayRecord[], start: string, end: string): CalendarEvent[] {
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  const events: CalendarEvent[] = [];

  for (const day of days) {
    if (!day.yearlyRepeat) {
      const occurrence = formatShanghaiDate(day.date);
      if (occurrence >= start && occurrence < end) {
        events.push(buildEvent(day, occurrence));
      }
      continue;
    }

    for (let year = startYear; year <= endYear; year += 1) {
      const occurrence = occurrenceForYear(day.date, year);
      if (occurrence >= start && occurrence < end) {
        events.push(buildEvent(day, occurrence));
      }
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title, "zh-CN"));
}

export async function getEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const { db } = await import("../../lib/db");
  const days = await db.specialDay.findMany({
    where: {
      OR: [
        { yearlyRepeat: true },
        {
          yearlyRepeat: false,
          date: {
            gte: dateFromInput(start),
            lt: dateFromInput(end),
          },
        },
      ],
    },
    orderBy: [{ date: "asc" }, { title: "asc" }],
  });

  return expandSpecialDayEvents(days, start, end);
}
