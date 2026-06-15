import type { CalendarEvent } from "../../lib/calendar";
import { db } from "../../lib/db";
import { dayjs, formatShanghaiDate } from "../../lib/dayjs";
import { moduleColors } from "../../lib/design";

function dateFromInput(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function exclusiveEnd(date: Date) {
  return dayjs(formatShanghaiDate(date)).add(1, "day").format("YYYY-MM-DD");
}

export async function getEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const trips = await db.trip.findMany({
    where: {
      startDate: { lt: dateFromInput(end) },
      endDate: { gte: dateFromInput(start) },
    },
    orderBy: [{ startDate: "asc" }, { endDate: "asc" }],
  });

  return trips.map((trip) => ({
    id: `trips:${trip.id}`,
    module: "trips",
    title: trip.title,
    start: formatShanghaiDate(trip.startDate),
    end: exclusiveEnd(trip.endDate),
    allDay: true,
    color: trip.status === "DONE" ? `${moduleColors.trips}B3` : moduleColors.trips,
    href: `/trips/${trip.id}`,
  }));
}
