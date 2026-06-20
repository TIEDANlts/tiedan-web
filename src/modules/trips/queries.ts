import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { formatShanghaiDate, formatShanghaiDateTime } from "@/lib/dayjs";
import { derivePrivateThumbUrl, parseTripLocations, tripDaysCount, type TripStatusValue } from "@/modules/trips/utils";
import type { Prisma } from "@prisma/client";

export type TripSearchParams = Record<string, string | string[] | undefined>;

export type TripPhoto = {
  url: string;
  thumbUrl: string;
};

export type TripDayItem = {
  id: string;
  date: string;
  noteMd: string;
  locations: ReturnType<typeof parseTripLocations>;
  photos: TripPhoto[];
};

export type TripListItem = {
  id: string;
  title: string;
  status: TripStatusValue;
  startDate: string;
  endDate: string;
  destinations: string[];
  coverUrl: string | null;
  daysCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TripsPageData = {
  status: TripStatusValue;
  trips: TripListItem[];
  counts: Record<TripStatusValue, number>;
  stats: {
    planned: number;
    done: number;
    cities: number;
  };
};

export type TripDetail = TripListItem & {
  summaryMd: string;
  budget: string | null;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  days: TripDayItem[];
};

export type FootprintPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  trips: number;
};

export type FootprintData = {
  points: FootprintPoint[];
  stats: {
    cities: number;
    trips: number;
  };
};

type SerializedLocation = ReturnType<typeof parseTripLocations>[number];

function firstParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseTripStatusParam(params: TripSearchParams): TripStatusValue {
  return firstParamValue(params.status) === "DONE" ? "DONE" : "PLANNED";
}

function serializeTripListItem(trip: {
  id: string;
  title: string;
  status: string;
  startDate: Date;
  endDate: Date;
  destinations: string[];
  coverUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TripListItem {
  const startDate = formatShanghaiDate(trip.startDate);
  const endDate = formatShanghaiDate(trip.endDate);

  return {
    id: trip.id,
    title: trip.title,
    status: trip.status as TripStatusValue,
    startDate,
    endDate,
    destinations: trip.destinations,
    coverUrl: trip.coverUrl,
    daysCount: tripDaysCount(startDate, endDate),
    createdAt: formatShanghaiDateTime(trip.createdAt),
    updatedAt: formatShanghaiDateTime(trip.updatedAt),
  };
}

function parseChecklist(value: unknown): TripDetail["checklist"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const row = item as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text.trim() : "";

    if (!text) {
      return [];
    }

    return [{
      id: typeof row.id === "string" && row.id ? row.id : text,
      text,
      done: row.done === true,
    }];
  });
}

function serializeDay(day: {
  id: string;
  date: Date;
  noteMd: string | null;
  locations: unknown;
  locationItems?: Array<{
    id: string;
    name: string;
    lat: Prisma.Decimal;
    lng: Prisma.Decimal;
  }>;
  photos: string[];
}): TripDayItem {
  const locations: SerializedLocation[] =
    day.locationItems && day.locationItems.length > 0
      ? day.locationItems.map((location) => ({
          id: location.id,
          name: location.name,
          lat: location.lat.toNumber(),
          lng: location.lng.toNumber(),
        }))
      : parseTripLocations(day.locations);

  return {
    id: day.id,
    date: formatShanghaiDate(day.date),
    noteMd: day.noteMd ?? "",
    locations,
    photos: day.photos.map((url) => ({
      url,
      thumbUrl: derivePrivateThumbUrl(url),
    })),
  };
}

export async function getTripsPageData(searchParams: TripSearchParams): Promise<TripsPageData> {
  const status = parseTripStatusParam(searchParams);
  const [trips, planned, done, completedTrips] = await Promise.all([
    db.trip.findMany({
      where: { status },
      orderBy: status === "PLANNED" ? [{ startDate: "asc" }, { updatedAt: "desc" }] : [{ endDate: "desc" }],
    }),
    db.trip.count({ where: { status: "PLANNED" } }),
    db.trip.count({ where: { status: "DONE" } }),
    db.trip.findMany({
      where: { status: "DONE" },
      select: { destinations: true },
    }),
  ]);
  const cities = new Set(completedTrips.flatMap((trip) => trip.destinations));

  return {
    status,
    trips: trips.map(serializeTripListItem),
    counts: { PLANNED: planned, DONE: done },
    stats: {
      planned,
      done,
      cities: cities.size,
    },
  };
}

export async function getTripDetail(id: string): Promise<TripDetail> {
  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      days: {
        orderBy: { date: "asc" },
        include: {
          locationItems: {
            orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  if (!trip) {
    notFound();
  }

  return {
    ...serializeTripListItem(trip),
    summaryMd: trip.summaryMd ?? "",
    budget: trip.budget?.toString() ?? null,
    checklist: parseChecklist(trip.checklist),
    days: trip.days.map(serializeDay),
  };
}

export async function getFootprintData(): Promise<FootprintData> {
  const trips = await db.trip.findMany({
    where: { status: "DONE" },
    include: {
      days: {
        include: {
          locationItems: {
            orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });
  const byName = new Map<string, FootprintPoint>();

  for (const trip of trips) {
    const namesInTrip = new Set<string>();
    for (const day of trip.days) {
      for (const location of serializeDay(day).locations) {
        const existing = byName.get(location.name);
        namesInTrip.add(location.name);
        if (!existing) {
          byName.set(location.name, {
            id: location.name,
            name: location.name,
            lat: location.lat,
            lng: location.lng,
            trips: 0,
          });
        }
      }
    }
    for (const name of namesInTrip) {
      const point = byName.get(name);
      if (point) {
        point.trips += 1;
      }
    }
  }

  return {
    points: Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    stats: {
      cities: byName.size,
      trips: trips.length,
    },
  };
}
