import { getEvents as getMediaEvents } from "../modules/media/events";
import { getEvents as getSpecialDayEvents } from "../modules/special-days/events";
import { getEvents as getTodoEvents } from "../modules/todos/events";
import { getEvents as getTripEvents } from "../modules/trips/events";

export type CalendarEventModule = "todos" | "trips" | "specialDays" | "media";

export type CalendarEvent = {
  id: string;
  module: CalendarEventModule;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  color: string;
  href: string;
};

export async function getAllEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const [todoEvents, tripEvents, specialDayEvents, mediaEvents] = await Promise.all([
    getTodoEvents(start, end),
    getTripEvents(start, end),
    getSpecialDayEvents(start, end),
    getMediaEvents(start, end),
  ]);

  return [...todoEvents, ...tripEvents, ...specialDayEvents, ...mediaEvents];
}
