"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { recordActivity, shouldRecordStatusTransition, tripDoneTitle } from "@/lib/activity";
import { db } from "@/lib/db";
import { formatShanghaiDate } from "@/lib/dayjs";
import { gcj02ToWgs84 } from "@/lib/geo";
import {
  dateFromInput,
  enumerateTripDates,
  planTripDaySync,
  parseTripLocations,
  readTripFormData,
  type TripLocation,
} from "@/modules/trips/utils";

export type TripActionState = {
  ok: boolean;
  message: string | null;
  tripId?: string;
  errors?: Partial<Record<"title" | "startDate" | "endDate" | "destinations" | "coverUrl" | "status" | "budget" | "form", string>>;
};

async function requireTripSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理旅行。");
  }
}

function revalidateTrips(id?: string) {
  revalidatePath("/trips");
  revalidatePath("/trips/footprint");
  revalidatePath("/");
  if (id) {
    revalidatePath(`/trips/${id}`);
  }
}

export async function createTripAction(_state: TripActionState, formData: FormData): Promise<TripActionState> {
  void _state;
  await requireTripSession();

  const input = readTripFormData(formData);

  if (!input.ok) {
    return { ok: false, message: "请检查行程信息。", errors: input.errors };
  }

  const trip = await db.trip.create({
    data: {
      ...input.data,
      days: {
        create: enumerateTripDates(
          formatShanghaiDate(input.data.startDate),
          formatShanghaiDate(input.data.endDate),
        ).map((date) => ({ date: dateFromInput(date) })),
      },
    },
  });

  revalidateTrips(trip.id);

  return { ok: true, tripId: trip.id, message: "行程已创建。" };
}

export async function updateTripOverviewAction(_state: TripActionState, formData: FormData): Promise<TripActionState> {
  void _state;
  await requireTripSession();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { ok: false, message: "缺少行程 ID。", errors: { form: "行程不存在。" } };
  }

  const existing = await db.trip.findUnique({
    where: { id },
    select: {
      status: true,
      days: {
        select: {
          id: true,
          date: true,
        },
      },
    },
  });
  if (!existing) {
    return { ok: false, message: "行程不存在。", errors: { form: "行程不存在。" } };
  }

  const input = readTripFormData(formData, { includeSummary: true });

  if (!input.ok) {
    return { ok: false, message: "请检查行程信息。", errors: input.errors };
  }

  const nextDates = enumerateTripDates(formatShanghaiDate(input.data.startDate), formatShanghaiDate(input.data.endDate));
  const daySync = planTripDaySync(existing.days, nextDates);

  await db.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id },
      data: input.data,
    });

    if (daySync.deleteIds.length > 0) {
      await tx.tripDay.deleteMany({
        where: { tripId: id, id: { in: daySync.deleteIds } },
      });
    }

    if (daySync.createDates.length > 0) {
      await tx.tripDay.createMany({
        data: daySync.createDates.map((date) => ({ tripId: id, date: dateFromInput(date) })),
        skipDuplicates: true,
      });
    }
  });

  if (shouldRecordStatusTransition(existing.status, input.data.status, "DONE")) {
    await recordActivity("trips", "done", id, tripDoneTitle(input.data.title));
  }

  revalidateTrips(id);

  return { ok: true, tripId: id, message: "行程信息已保存。" };
}

export async function saveChecklistAction(tripId: string, checklist: Array<{ id: string; text: string; done: boolean }>) {
  await requireTripSession();

  const normalized = checklist
    .map((item) => ({
      id: item.id || randomUUID(),
      text: item.text.trim(),
      done: item.done === true,
    }))
    .filter((item) => item.text);

  await db.trip.update({
    where: { id: tripId },
    data: { checklist: normalized },
  });

  revalidateTrips(tripId);

  return { ok: true, message: "清单已保存。" };
}

export async function updateTripDayNoteAction(dayId: string, noteMd: string) {
  await requireTripSession();

  const day = await db.tripDay.update({
    where: { id: dayId },
    data: { noteMd: noteMd.trim() || null },
    select: { tripId: true },
  });

  revalidateTrips(day.tripId);

  return { ok: true, message: "当天笔记已保存。" };
}

export async function addTripLocationAction(input: {
  dayId: string;
  name: string;
  lat: number;
  lng: number;
  fromGcj02?: boolean;
}) {
  await requireTripSession();

  const day = await db.tripDay.findUnique({
    where: { id: input.dayId },
    select: { tripId: true, locations: true },
  });
  if (!day) {
    return { ok: false, message: "这一天不存在。" };
  }

  const name = input.name.trim();
  const sourceLat = Number(input.lat);
  const sourceLng = Number(input.lng);
  if (!name || !Number.isFinite(sourceLat) || !Number.isFinite(sourceLng)) {
    return { ok: false, message: "请填写地点名称和有效坐标。" };
  }

  const converted = input.fromGcj02 ? gcj02ToWgs84(sourceLat, sourceLng) : { lat: sourceLat, lng: sourceLng };
  const locations: TripLocation[] = [
    ...parseTripLocations(day.locations),
    {
      id: randomUUID(),
      name,
      lat: Number(converted.lat.toFixed(6)),
      lng: Number(converted.lng.toFixed(6)),
    },
  ];

  await db.tripDay.update({
    where: { id: input.dayId },
    data: { locations },
  });

  revalidateTrips(day.tripId);

  return { ok: true, message: "地点已加入当天行程。" };
}

export async function removeTripLocationAction(dayId: string, locationId: string) {
  await requireTripSession();

  const day = await db.tripDay.findUnique({
    where: { id: dayId },
    select: { tripId: true, locations: true },
  });
  if (!day) {
    return { ok: false, message: "这一天不存在。" };
  }

  await db.tripDay.update({
    where: { id: dayId },
    data: {
      locations: parseTripLocations(day.locations).filter((location) => location.id !== locationId),
    },
  });

  revalidateTrips(day.tripId);

  return { ok: true, message: "地点已移除。" };
}

export async function addTripPhotoAction(dayId: string, url: string) {
  await requireTripSession();

  if (!url.startsWith("/api/files/private/")) {
    return { ok: false, message: "照片必须来自私密上传区。" };
  }

  const day = await db.tripDay.update({
    where: { id: dayId },
    data: {
      photos: {
        push: url,
      },
    },
    select: { tripId: true },
  });

  revalidateTrips(day.tripId);

  return { ok: true, message: "照片已加入当天行程。" };
}

export async function removeTripPhotoAction(dayId: string, url: string) {
  await requireTripSession();

  const day = await db.tripDay.findUnique({
    where: { id: dayId },
    select: { tripId: true, photos: true },
  });
  if (!day) {
    return { ok: false, message: "这一天不存在。" };
  }

  await db.tripDay.update({
    where: { id: dayId },
    data: {
      photos: day.photos.filter((photo) => photo !== url),
    },
  });

  revalidateTrips(day.tripId);

  return { ok: true, message: "照片已移除。" };
}
