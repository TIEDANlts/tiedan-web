"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatShanghaiDate } from "@/lib/dayjs";

export type SpecialDayActionState = {
  ok: boolean;
  message: string | null;
  errors?: Partial<Record<"title" | "date" | "icon" | "note" | "form", string>>;
};

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理重要日子。");
  }
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDateInput(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  return formatShanghaiDate(new Date(`${date}T00:00:00.000Z`)) === date;
}

function dateToDb(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function createSpecialDayAction(
  _state: SpecialDayActionState,
  formData: FormData,
): Promise<SpecialDayActionState> {
  await requireSession();

  const title = readString(formData.get("title"));
  const date = readString(formData.get("date"));
  const icon = readString(formData.get("icon"));
  const note = readString(formData.get("note"));
  const yearlyRepeat = ["on", "true", "1"].includes(readString(formData.get("yearlyRepeat")));
  const errors: SpecialDayActionState["errors"] = {};

  if (!title) {
    errors.title = "写一个日子名称。";
  }

  if (!date || !isValidDateInput(date)) {
    errors.date = "请选择有效日期。";
  }

  if (icon.length > 12) {
    errors.icon = "图标请控制在 12 个字符内。";
  }

  if (note.length > 1000) {
    errors.note = "备注请控制在 1000 个字符内。";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "请检查重要日子信息。", errors };
  }

  await db.specialDay.create({
    data: {
      title,
      date: dateToDb(date),
      yearlyRepeat,
      icon: icon || null,
      note: note || null,
    },
  });

  revalidatePath("/calendar");

  return { ok: true, message: "重要日子已加入日历。" };
}
