import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getAllEvents } from "@/lib/calendar";
import { formatShanghaiDate } from "@/lib/dayjs";

export const dynamic = "force-dynamic";

function isDateInput(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return formatShanghaiDate(new Date(`${value}T00:00:00.000Z`)) === value;
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "请先登录后再查看日历。" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const start = params.get("start");
  const end = params.get("end");

  if (!isDateInput(start) || !isDateInput(end) || start >= end) {
    return NextResponse.json({ error: "日期范围无效。" }, { status: 400 });
  }

  return NextResponse.json({ events: await getAllEvents(start, end) });
}
