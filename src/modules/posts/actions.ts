"use server";

import { PostStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { hasActivity, postPublishedTitle, recordActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { normalizePostInput } from "@/modules/posts/utils";

export type PostActionState = {
  ok: boolean;
  message: string | null;
  postId?: string;
  errors?: Partial<Record<"title" | "slug" | "contentMd" | "form", string>>;
};

const initialPublishedPaths = ["/blog", "/blog/page/[page]", "/rss.xml"] as const;

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理博客。");
  }
}

function revalidatePostPaths(...slugs: Array<string | null | undefined>) {
  for (const path of initialPublishedPaths) {
    revalidatePath(path, path.includes("[") ? "page" : undefined);
  }

  for (const slug of slugs) {
    if (slug) {
      revalidatePath(`/blog/${slug}`);
    }
  }

  revalidatePath("/admin/posts");
}

function readTags(formData: FormData) {
  return String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function readPostInput(formData: FormData) {
  return normalizePostInput({
    title: formData.get("title"),
    slug: formData.get("slug"),
    category: formData.get("category"),
    tags: readTags(formData),
    summary: formData.get("summary"),
    contentMd: formData.get("contentMd"),
  });
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function savePostAction(
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  await requireSession();

  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "draft");
  const input = readPostInput(formData);

  if (!input.ok) {
    return { ok: false, message: "请检查文章信息。", errors: input.errors };
  }

  try {
    const existing = id
      ? await db.post.findUnique({
          where: { id },
          select: { status: true, slug: true, publishedAt: true },
        })
      : null;

    if (id && !existing) {
      return { ok: false, message: "这篇文章已经不存在。", errors: { form: "文章不存在。" } };
    }

    const shouldPublish = intent === "publish";
    const nextStatus = shouldPublish
      ? PostStatus.PUBLISHED
      : existing?.status === PostStatus.PUBLISHED
        ? PostStatus.PUBLISHED
        : PostStatus.DRAFT;
    const wasPublished = existing?.status === PostStatus.PUBLISHED;

    const data = {
      ...input.data,
      status: nextStatus,
      publishedAt: nextStatus === PostStatus.PUBLISHED ? (existing?.publishedAt ?? new Date()) : null,
    };

    const post = id
      ? await db.post.update({
          where: { id },
          data,
        })
      : await db.post.create({
          data,
        });

    if (post.status === PostStatus.PUBLISHED && !wasPublished && !(await hasActivity("posts", "published", post.id))) {
      await recordActivity("posts", "published", post.id, postPublishedTitle(post.title));
    }

    if (wasPublished || post.status === PostStatus.PUBLISHED) {
      revalidatePostPaths(existing?.slug, post.slug);
    } else {
      revalidatePath("/admin/posts");
    }

    return {
      ok: true,
      postId: post.id,
      message: post.status === PostStatus.PUBLISHED ? "文章已发布。" : "草稿已保存。",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "这个 Slug 已经被其他文章使用。",
        errors: { slug: "换一个更独特的 Slug。" },
      };
    }

    throw error;
  }
}

export async function withdrawPostAction(id: string) {
  await requireSession();

  const post = await db.post.update({
    where: { id },
    data: {
      status: PostStatus.DRAFT,
      publishedAt: null,
    },
    select: {
      slug: true,
    },
  });

  revalidatePostPaths(post.slug);
}

export async function deletePostAction(id: string) {
  await requireSession();

  const post = await db.post.delete({
    where: { id },
    select: {
      slug: true,
      status: true,
    },
  });

  if (post.status === PostStatus.PUBLISHED) {
    revalidatePostPaths(post.slug);
  } else {
    revalidatePath("/admin/posts");
  }
}
