import { db } from "@/lib/db";
import { buildViewKey } from "@/modules/posts/utils";

const VIEW_DEBOUNCE_MS = 10 * 60 * 1000;

type ViewDebounceEntry = {
  at: number;
  token: symbol;
};

const globalForViews = globalThis as unknown as {
  postViewDebounce?: Map<string, ViewDebounceEntry>;
};

const viewDebounce = globalForViews.postViewDebounce ?? new Map<string, ViewDebounceEntry>();

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

  for (const [key, lastSeen] of viewDebounce) {
    if (now - lastSeen.at >= VIEW_DEBOUNCE_MS) {
      viewDebounce.delete(key);
    }
  }
}

export function shouldCountView(ip: string, slug: string, now = Date.now()) {
  sweepExpired(now);

  const key = buildViewKey(ip, slug);
  const lastSeen = viewDebounce.get(key);

  return lastSeen === undefined || now - lastSeen.at >= VIEW_DEBOUNCE_MS;
}

export function commitCountedView(ip: string, slug: string, now = Date.now()) {
  viewDebounce.set(buildViewKey(ip, slug), { at: now, token: Symbol("post-view-committed") });
}

export function reserveCountedView(ip: string, slug: string, now = Date.now()) {
  const key = buildViewKey(ip, slug);
  const previous = viewDebounce.get(key);
  const token = Symbol("post-view-reservation");

  viewDebounce.set(key, { at: now, token });

  return () => {
    if (viewDebounce.get(key)?.token !== token) {
      return;
    }

    if (previous === undefined) {
      viewDebounce.delete(key);
      return;
    }

    viewDebounce.set(key, previous);
  };
}

export function resetPostViewDebounceForTest() {
  viewDebounce.clear();
  lastSweepAt = 0;
}

export async function recordPostView(slug: string, ip: string, now = Date.now()) {
  if (!shouldCountView(ip, slug, now)) {
    return { counted: false };
  }

  const rollbackReservation = reserveCountedView(ip, slug, now);

  try {
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

    if (updated.count === 0) {
      rollbackReservation();
      return { counted: false };
    }

    commitCountedView(ip, slug, now);
    return { counted: true };
  } catch (error) {
    rollbackReservation();
    throw error;
  }
}
