import { db } from "./db";
import { formatShanghaiDate, toShanghaiTime } from "./dayjs";
import type { ModuleColorKey } from "./design";

export type ActivityModule = ModuleColorKey | "settings";

export type ActivityInput = {
  module: string;
  action: string;
  refId: string;
};

export type ActivityRow = ActivityInput & {
  id: string;
  title: string;
  happenedAt: Date;
};

export type TimelineActivity = ActivityRow & {
  href: string;
  time: string;
};

export type ActivityDayGroup = {
  date: string;
  label: string;
  items: TimelineActivity[];
};

export async function recordActivity(module: string, action: string, refId: string, title: string) {
  return db.activity.upsert({
    where: {
      module_action_refId: {
        module,
        action,
        refId,
      },
    },
    create: {
      module,
      action,
      refId,
      title,
    },
    update: {
      title,
    },
  });
}

export function shouldRecordStatusTransition(previousStatus: string, nextStatus: string, targetStatus: string) {
  return previousStatus !== targetStatus && nextStatus === targetStatus;
}

export function gameFinishedTitle(name: string) {
  return `通关了《${name}》`;
}

export function mediaDoneTitle(type: string, title: string) {
  return `${type === "BOOK" ? "读完" : "看完"}《${title}》`;
}

export function postPublishedTitle(title: string) {
  return `发布了文章《${title}》`;
}

export function tripDoneTitle(title: string) {
  return `完成了旅行：${title}`;
}

export function expenseImportTitle(count: number) {
  return `导入了 ${count} 笔账单`;
}

export function activityHref(activity: ActivityInput) {
  if (activity.module === "media") {
    return `/media/${activity.refId}`;
  }

  if (activity.module === "posts") {
    return `/admin/posts/${activity.refId}`;
  }

  if (activity.module === "trips") {
    return `/trips/${activity.refId}`;
  }

  if (activity.module === "expenses" && activity.action === "imported") {
    return `/expenses/import/result/${activity.refId}`;
  }

  if (activity.module === "todos") {
    return "/todos";
  }

  if (activity.module === "games") {
    return "/games";
  }

  return "/";
}

async function resolveActivityHrefs(rows: ActivityRow[]) {
  const postIds = rows
    .filter((row) => row.module === "posts" && row.action === "published")
    .map((row) => row.refId);

  if (postIds.length === 0) {
    return new Map<string, string>();
  }

  const posts = await db.post.findMany({
    where: { id: { in: postIds } },
    select: { id: true, slug: true },
  });

  return new Map(posts.map((post) => [`posts:published:${post.id}`, `/blog/${post.slug}`]));
}

function activityLabel(date: Date) {
  const shanghai = toShanghaiTime(date);

  return `${shanghai.month() + 1}月${shanghai.date()}日`;
}

export function groupActivitiesByDay(rows: ActivityRow[], hrefs = new Map<string, string>()): ActivityDayGroup[] {
  const groups = new Map<string, ActivityDayGroup>();

  for (const row of rows) {
    const date = formatShanghaiDate(row.happenedAt);
    const href = hrefs.get(`${row.module}:${row.action}:${row.refId}`) ?? activityHref(row);
    const group = groups.get(date) ?? {
      date,
      label: activityLabel(row.happenedAt),
      items: [],
    };

    group.items.push({
      ...row,
      href,
      time: toShanghaiTime(row.happenedAt).format("HH:mm"),
    });
    groups.set(date, group);
  }

  return Array.from(groups.values());
}

export async function getRecentActivityGroups(limit = 20) {
  const rows = await db.activity.findMany({
    orderBy: { happenedAt: "desc" },
    take: limit,
  });
  const hrefs = await resolveActivityHrefs(rows);

  return groupActivitiesByDay(rows, hrefs);
}
