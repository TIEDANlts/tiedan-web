import type { CalendarEvent } from "../../lib/calendar";
import { db } from "../../lib/db";
import { formatShanghaiDate } from "../../lib/dayjs";
import { moduleColors } from "../../lib/design";

function dateFromInput(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function getEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const items = await db.mediaItem.findMany({
    where: {
      status: "WISHLIST",
      releaseDate: {
        gte: dateFromInput(start),
        lt: dateFromInput(end),
      },
    },
    orderBy: [{ releaseDate: "asc" }, { title: "asc" }],
  });

  return items.flatMap((item) => {
    if (!item.releaseDate) {
      return [];
    }

    return [{
      id: `media:${item.id}`,
      module: "media" as const,
      title: `《${item.title}》上映`,
      start: formatShanghaiDate(item.releaseDate),
      allDay: true,
      color: moduleColors.media,
      href: `/media/${item.id}`,
    }];
  });
}
