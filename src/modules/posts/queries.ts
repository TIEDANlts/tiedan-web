import { PostStatus } from "@prisma/client";

import { db } from "@/lib/db";

export const POSTS_PER_PAGE = 10;

export type AdminPostFilters = {
  status?: "ALL" | PostStatus;
  query?: string;
};

export type AdminPostListItem = Awaited<ReturnType<typeof getAdminPosts>>[number];
export type PublishedPostListItem = Awaited<ReturnType<typeof getPublishedPostsPage>>["posts"][number];

function publishedOrderBy() {
  return [{ publishedAt: "desc" as const }, { createdAt: "desc" as const }];
}

export async function getAdminPosts(filters: AdminPostFilters = {}) {
  return db.post.findMany({
    where: {
      status: filters.status && filters.status !== "ALL" ? filters.status : undefined,
      title: filters.query
        ? {
            contains: filters.query,
            mode: "insensitive",
          }
        : undefined,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPostForEdit(id: string) {
  return db.post.findUnique({
    where: { id },
  });
}

export async function getPublishedPostCount() {
  return db.post.count({
    where: { status: PostStatus.PUBLISHED },
  });
}

export async function getPublishedPageCount() {
  return Math.max(1, Math.ceil((await getPublishedPostCount()) / POSTS_PER_PAGE));
}

export async function getPublishedPostsPage(page: number) {
  const safePage = Math.max(1, Math.floor(page));
  const [total, posts] = await Promise.all([
    getPublishedPostCount(),
    db.post.findMany({
      where: { status: PostStatus.PUBLISHED },
      orderBy: publishedOrderBy(),
      skip: (safePage - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
    }),
  ]);

  return {
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)),
    total,
    posts,
  };
}

export async function getPublishedSlugs() {
  return db.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    select: { slug: true },
    orderBy: publishedOrderBy(),
  });
}

export async function getPublishedPostBySlug(slug: string) {
  const post = await db.post.findFirst({
    where: { slug, status: PostStatus.PUBLISHED },
  });

  if (!post) {
    return null;
  }

  const posts = await db.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    select: { slug: true, title: true },
    orderBy: publishedOrderBy(),
  });
  const index = posts.findIndex((item) => item.slug === post.slug);

  return {
    post,
    previous: index > 0 ? posts[index - 1] : null,
    next: index >= 0 && index < posts.length - 1 ? posts[index + 1] : null,
  };
}

export async function getRecentPublishedPosts(limit = 20) {
  return db.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    orderBy: publishedOrderBy(),
    take: limit,
  });
}
