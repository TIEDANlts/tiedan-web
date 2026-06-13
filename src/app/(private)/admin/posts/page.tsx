import { PostStatus } from "@prisma/client";

import { PostsAdmin } from "@/app/(private)/admin/posts/posts-admin";
import { getAdminPosts } from "@/modules/posts/queries";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status === PostStatus.DRAFT || params.status === PostStatus.PUBLISHED
      ? params.status
      : "ALL";
  const query = params.q?.trim() ?? "";
  const posts = await getAdminPosts({ status, query });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <PostsAdmin posts={posts} status={status} query={query} />
    </main>
  );
}
