import { BlogListPage } from "@/app/(public)/blog/blog-list-page";
import { parseBlogPageParam } from "@/modules/posts/utils";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BlogPagedPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const parsedPage = parseBlogPageParam(page);

  if (!parsedPage) {
    notFound();
  }

  return <BlogListPage page={parsedPage} />;
}
