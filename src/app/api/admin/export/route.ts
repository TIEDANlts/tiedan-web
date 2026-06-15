import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createJsonZip } from "@/lib/export-zip";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function jsonSafe(value: unknown) {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (typeof item === "bigint") {
        return item.toString();
      }

      if (item && typeof item === "object" && "toString" in item && item.constructor?.name === "Decimal") {
        return item.toString();
      }

      return item;
    }),
  ) as unknown[];
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "请先登录后再导出数据。" }, { status: 401 });
  }

  const [
    games,
    mediaItems,
    trips,
    posts,
    transactions,
    expenseCategories,
    todos,
    specialDays,
    links,
    activities,
  ] = await Promise.all([
    db.game.findMany({ orderBy: { createdAt: "asc" } }),
    db.mediaItem.findMany({ orderBy: { createdAt: "asc" } }),
    db.trip.findMany({ include: { days: { orderBy: { date: "asc" } } }, orderBy: { createdAt: "asc" } }),
    db.post.findMany({ orderBy: { createdAt: "asc" } }),
    db.transaction.findMany({ orderBy: { createdAt: "asc" } }),
    db.expenseCategory.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }] }),
    db.todo.findMany({ orderBy: { createdAt: "asc" } }),
    db.specialDay.findMany({ orderBy: { date: "asc" } }),
    db.link.findMany({ orderBy: [{ group: "asc" }, { sort: "asc" }, { title: "asc" }] }),
    db.activity.findMany({ orderBy: { happenedAt: "asc" } }),
  ]);
  const exportedAt = new Date().toISOString();
  const zip = createJsonZip({
    generatedAt: exportedAt,
    tables: {
      Game: jsonSafe(games),
      MediaItem: jsonSafe(mediaItems),
      Trip: jsonSafe(trips),
      Post: jsonSafe(posts),
      Transaction: jsonSafe(transactions),
      ExpenseCategory: jsonSafe(expenseCategories),
      Todo: jsonSafe(todos),
      SpecialDay: jsonSafe(specialDays),
      Link: jsonSafe(links),
      Activity: jsonSafe(activities),
    },
  });
  const filename = `tiedan-export-${exportedAt.slice(0, 10)}.zip`;

  return new Response(zip, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
