import { db } from "@/lib/db";
import { buildViewKey } from "@/modules/posts/utils";

const VIEW_DEBOUNCE_MS = 10 * 60 * 1000;

const globalForViews = globalThis as unknown as {
  postViewDebounce?: Map<string, number>;
};

const viewDebounce = globalForViews.postViewDebounce ?? new Map<string, number>();

if (process.env.NODE_ENV !== "production") {
  globalForViews.postViewDebounce = viewDebounce;
}

// 上次清理时间。去重 Map 里的键只增不减会随访客增长而无限膨胀，
// 因此每隔一个去重窗口顺带清理一次过期键，把 Map 大小约束在「一个窗口内的去重对」量级。
let lastSweepAt = 0;

function sweepExpired(now: number) {
  if (now - lastSweepAt < VIEW_DEBOUNCE_MS) {
    return;
  }

  lastSweepAt = now;

  for (const [key, lastSeenAt] of viewDebounce) {
    if (now - lastSeenAt >= VIEW_DEBOUNCE_MS) {
      viewDebounce.delete(key);
    }
  }
}

export function shouldCountView(ip: string, slug: string, now = Date.now()) {
  sweepExpired(now);

  const key = buildViewKey(ip, slug);
  const lastSeenAt = viewDebounce.get(key);

  return lastSeenAt === undefined || now - lastSeenAt >= VIEW_DEBOUNCE_MS;
}

export function commitCountedView(ip: string, slug: string, now = Date.now()) {
  viewDebounce.set(buildViewKey(ip, slug), now);
}

export async function recordPostView(slug: string, ip: string, now = Date.now()) {
  if (!shouldCountView(ip, slug, now)) {
    return { counted: false };
  }

  const updated = await db.post.updateMany({
    where: {
      slug,
      status: "PUBLISHED",
    },
    data: {
      views: {
        increment: 1,
      },
    },
  });

  if (updated.count > 0) {
    commitCountedView(ip, slug, now);
  }

  return { counted: updated.count > 0 };
}
