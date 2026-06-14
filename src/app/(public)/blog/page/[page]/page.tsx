import { BlogListPage } from "@/app/(public)/blog/blog-list-page";

export const dynamic = "force-dynamic";

export default async function BlogPagedPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;

  return <BlogListPage page={Number(page)} />;
}
