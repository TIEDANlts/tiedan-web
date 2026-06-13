import { notFound } from "next/navigation";

import { PostEditor } from "@/app/(private)/admin/posts/post-editor";
import { getPostForEdit } from "@/modules/posts/queries";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostForEdit(id);

  if (!post) {
    notFound();
  }

  return <PostEditor post={post} />;
}
