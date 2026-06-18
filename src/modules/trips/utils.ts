import { Prisma } from "@prisma/client";

import { formatShanghaiDate } from "../../lib/dayjs";

export const tripStatuses = ["PLANNED", "DONE"] as const;
export type TripStatusValue = (typeof tripStatuses)[number];
export type TripStatusFilter = "PLANNED" | "DONE";

export type TripLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type TripInput = {
  title: FormDataEntryValue | string | null;
  startDate: FormDataEntryValue | string | null;
  endDate: FormDataEntryValue | string | null;
  destinations: FormDataEntryValue | string | string[] | null;
  coverUrl?: FormDataEntryValue | string | null;
  status?: FormDataEntryValue | string | null;
  summaryMd?: FormDataEntryValue | string | null;
  budget?: FormDataEntryValue | string | null;
};

export type NormalizedTripInput =
  | {
      ok: true;
      data: {
        title: string;
        startDate: Date;
        endDate: Date;
        destinations: string[];
        coverUrl: string | null;
        status: TripStatusValue;
        summaryMd: string | null;
        budget: Prisma.Decimal | null;
      };
    }
  | {
      ok: false;
      errors: Partial<Record<"title" | "startDate" | "endDate" | "destinations" | "coverUrl" | "status" | "budget", string>>;
    };

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

export function isTripStatus(value: string): value is TripStatusValue {
  return tripStatuses.includes(value as TripStatusValue);
}

export const tripStatusLabels = {
  PLANNED: "计划中",
  DONE: "已完成",
} as const satisfies Record<TripStatusValue, string>;

export function normalizeDestinations(raw: TripInput["destinations"]) {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];

  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export function dateFromInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function isDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dateFromInput(value).getTime());
}

function isAllowedCoverUrl(value: string) {
  return value.startsWith("/uploads/");
}

export function enumerateTripDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const start = dateFromInput(startDate);
  const end = dateFromInput(endDate);

  for (let current = start; current <= end; current = new Date(current.getTime() + 86_400_000)) {
    dates.push(formatShanghaiDate(current));
  }

  return dates;
}

export function tripDaysCount(startDate: string, endDate: string) {
  return enumerateTripDates(startDate, endDate).length;
}

export function planTripDaySync(existingDays: Array<{ id: string; date: Date }>, nextDates: string[]) {
  const nextDateSet = new Set(nextDates);
  const existingDateSet = new Set(existingDays.map((day) => formatShanghaiDate(day.date)));

  return {
    createDates: nextDates.filter((date) => !existingDateSet.has(date)),
    deleteIds: existingDays
      .filter((day) => !nextDateSet.has(formatShanghaiDate(day.date)))
      .map((day) => day.id),
  };
}

function normalizeBudget(rawBudget: FormDataEntryValue | string | null | undefined): { value: Prisma.Decimal | null } | { error: string } {
  const budget = stringValue(rawBudget);

  if (!budget) {
    return { value: null } as const;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(budget)) {
    return { error: "预算必须是最多两位小数的非负金额。" } as const;
  }

  return { value: new Prisma.Decimal(budget) } as const;
}

export function normalizeTripInput(input: TripInput): NormalizedTripInput {
  const title = stringValue(input.title);
  const startDate = stringValue(input.startDate);
  const endDate = stringValue(input.endDate);
  const destinations = normalizeDestinations(input.destinations);
  const coverUrl = stringValue(input.coverUrl);
  const status = stringValue(input.status) || "PLANNED";
  const summaryMd = stringValue(input.summaryMd);
  const budget = normalizeBudget(input.budget);
  const errors: Extract<NormalizedTripInput, { ok: false }>["errors"] = {};

  if (!title) {
    errors.title = "标题不能为空。";
  }

  if (!isDateInput(startDate)) {
    errors.startDate = "请选择有效的开始日期。";
  }

  if (!isDateInput(endDate)) {
    errors.endDate = "请选择有效的结束日期。";
  }

  if (isDateInput(startDate) && isDateInput(endDate) && dateFromInput(endDate) < dateFromInput(startDate)) {
    errors.endDate = "结束日期不能早于开始日期。";
  }

  if (destinations.length === 0) {
    errors.destinations = "至少填写一个目的地。";
  }

  if (coverUrl && !isAllowedCoverUrl(coverUrl)) {
    errors.coverUrl = "封面必须是本地 public 上传路径。";
  }

  if (!isTripStatus(status)) {
    errors.status = "请选择有效的行程状态。";
  }

  if ("error" in budget) {
    errors.budget = budget.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const normalizedBudget = "value" in budget ? budget.value : null;

  return {
    ok: true,
    data: {
      title,
      startDate: dateFromInput(startDate),
      endDate: dateFromInput(endDate),
      destinations,
      coverUrl: coverUrl || null,
      status: status as TripStatusValue,
      summaryMd: summaryMd || null,
      budget: normalizedBudget,
    },
  };
}

export function parseTripLocations(value: unknown): TripLocation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const raw = item as Record<string, unknown>;
    const name = stringValue(raw.name);
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }

    return [{
      id: stringValue(raw.id) || `${name}-${lat}-${lng}`,
      name,
      lat,
      lng,
    }];
  });
}

export function derivePrivateThumbUrl(url: string) {
  return url.replace(/(\.[a-z0-9]+)$/i, "-thumb$1");
}
