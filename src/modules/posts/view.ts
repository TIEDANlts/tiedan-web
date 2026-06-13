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

export function shouldCountView(ip: string, slug: string, now = Date.now()) {
  const key = buildViewKey(ip, slug);
  const lastSeenAt = viewDebounce.get(key) ?? 0;

  if (now - lastSeenAt < VIEW_DEBOUNCE_MS) {
    return false;
  }

  viewDebounce.set(key, now);
  return true;
}

export async function recordPostView(slug: string, ip: string) {
  if (!shouldCountView(ip, slug)) {
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

  return { counted: updated.count > 0 };
}
